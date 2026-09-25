"""
Resilient LLM client orchestrating primary (Groq) and fallback (Gemini) providers,
with transparent Mock fallback for testing and offline development.
"""

import json
import logging
from typing import Any, Dict, List, Optional
from app.core.config import settings
from app.engine.models import Question
from app.llm.base import LLMProvider, LLMProviderError
from app.llm.openrouter_provider import OpenRouterPoolProvider
from app.llm.mock_provider import MockProvider
from app.llm.prompts import (
    SYSTEM_PROMPT_HYPOTHESIS_GENERATION,
    SYSTEM_PROMPT_QUESTION_GENERATION,
    SYSTEM_PROMPT_REMEDIATION,
    SYSTEM_PROMPT_SELF_CONSISTENCY,
    USER_PROMPT_HYPOTHESIS_GENERATION,
    USER_PROMPT_QUESTION_GENERATION,
    USER_PROMPT_REMEDIATION,
    USER_PROMPT_SELF_CONSISTENCY,
)
from app.llm.schemas import (
    HypothesisProposalResponse,
    LLMResponse,
    RemediationResponse,
    SelfConsistencyResponse,
    VideoSnippet,
)

logger = logging.getLogger(__name__)

CURATED_EDUCATIONAL_VIDEOS: Dict[str, Dict[str, Any]] = {
    "force_causes_motion": {
        "title": "Newton's First Law: Inertia & Friction (CrashCourse Physics #4)",
        "youtube_video_id": "kKKM8Y-u7ds",
        "start_seconds": 62,
        "end_seconds": 195,
        "concept_summary": "Objects keep moving at constant velocity on their own; force is only required to CHANGE motion.",
    },
    "force_acceleration_confusion": {
        "title": "Newton's Second Law & Acceleration (CrashCourse Physics #7)",
        "youtube_video_id": "OUB4B5bV2u4",
        "start_seconds": 45,
        "end_seconds": 180,
        "concept_summary": "Net force produces acceleration (F = ma), not velocity. Constant velocity means zero net force.",
    },
    "action_reaction_cancellation": {
        "title": "Newton's Third Law: Action-Reaction Pairs (CrashCourse Physics #8)",
        "youtube_video_id": "y61_498305E",
        "start_seconds": 75,
        "end_seconds": 210,
        "concept_summary": "Action and reaction forces act on different objects, so they never cancel each other out.",
    },
    "heavier_falls_faster": {
        "title": "Galileo's Free Fall & Gravity (Veritasium)",
        "youtube_video_id": "E43-CfukEgs",
        "start_seconds": 40,
        "end_seconds": 160,
        "concept_summary": "In a vacuum, all objects fall with the exact same acceleration regardless of their mass.",
    },
}


async def search_youtube_video(topic: str, misconception_label: str) -> Optional[VideoSnippet]:
    """
    Retrieves a verified, embeddable YouTube educational video using YouTube Data API v3.
    If API key is missing, quota exceeded, or no video found, returns None (clean fallback).
    """
    import httpx

    if settings.YOUTUBE_API_KEY and settings.YOUTUBE_API_KEY.strip():
        # Focus query on topic domain tutorial
        query = f"{topic} educational tutorial crashcourse"
        url = "https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "videoEmbeddable": "true",
            "key": settings.YOUTUBE_API_KEY.strip(),
            "maxResults": 3,
            "safeSearch": "moderate",
        }
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(url, params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    items = data.get("items", [])
                    # Verify topic relevance: at least one word from topic must appear
                    topic_words = [w.lower() for w in topic.split() if len(w) > 3 and w.lower() not in ["what", "when", "with", "from", "about", "laws", "into"]]
                    for item in items:
                        if "id" in item and "videoId" in item["id"]:
                            vid_id = item["id"]["videoId"]
                            snip = item.get("snippet", {})
                            title = snip.get("title", f"{topic} Breakdown")
                            desc = snip.get("description", f"Tutorial covering {topic}.")
                            combined_text = f"{title} {desc}".lower()
                            if not topic_words or all(w in combined_text for w in topic_words):
                                return VideoSnippet(
                                    title=title,
                                    youtube_video_id=vid_id,
                                    start_seconds=0,
                                    end_seconds=180,
                                    concept_summary=desc[:200] if desc else f"Tutorial addressing {topic}.",
                                )
                else:
                    logger.warning("YouTube Data API returned status %s: %s", resp.status_code, resp.text[:150])
        except Exception as exc:
            logger.warning("YouTube Data API request failed: %s", exc)

    # Check curated physics videos ONLY if topic/misconception matches physics
    combined = f"{topic} {misconception_label}".lower()
    if any(k in combined for k in ["physics", "force", "newton", "gravity", "motion", "inertia"]):
        for k, v in CURATED_EDUCATIONAL_VIDEOS.items():
            if k in misconception_label.lower().replace(" ", "_") or k in combined:
                return VideoSnippet(
                    title=v["title"],
                    youtube_video_id=v["youtube_video_id"],
                    start_seconds=v.get("start_seconds", 0),
                    end_seconds=v.get("end_seconds", 120),
                    concept_summary=v["concept_summary"],
                )
    return None


def generate_default_visual_svg(misconception_id: str, concept: str, label: str) -> str:
    """Generates a clean, domain-appropriate SVG visual diagram contrasting the misconception with physical/conceptual reality."""
    combined = f"{misconception_id} {concept} {label}".lower()

    # Domain 1: Data Structures & Algorithms / Computer Science
    if any(k in combined for k in ["search", "array", "list", "sort", "tree", "graph", "dsa", "pointer", "binary", "algorithm", "loop", "index", "travers"]):
        return f'''<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <defs>
    <linearGradient id="gradWrongDsa" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF2F2" />
      <stop offset="100%" stop-color="#FEE2E2" />
    </linearGradient>
    <linearGradient id="gradRightDsa" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4" />
      <stop offset="100%" stop-color="#DCFCE7" />
    </linearGradient>
    <marker id="arrowBlueDsa" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill="#2563EB" />
    </marker>
  </defs>

  <!-- Left: Intuitive Fallacy -->
  <rect x="20" y="20" width="315" height="220" rx="12" fill="url(#gradWrongDsa)" stroke="#F87171" stroke-width="1.5" />
  <text x="35" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#991B1B">INTUITIVE FALLACY</text>
  <text x="35" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#B91C1C">"{label}"</text>

  <rect x="45" y="95" width="265" height="40" rx="6" fill="#FFFFFF" stroke="#EF4444" stroke-width="1.5" />
  <text x="177" y="120" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#DC2626" text-anchor="middle">Expecting Instant O(1) Match in Unsorted Array</text>
  <line x1="80" y1="145" x2="220" y2="145" stroke="#EF4444" stroke-width="2" stroke-dasharray="4" />
  <text x="35" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">Mistaken Belief: Elements can be found without</text>
  <text x="35" y="202" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">examining each index position sequentially.</text>

  <!-- Right: Algorithm Reality -->
  <rect x="365" y="20" width="315" height="220" rx="12" fill="url(#gradRightDsa)" stroke="#4ADE80" stroke-width="1.5" />
  <text x="380" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#166534">ALGORITHMIC REALITY</text>
  <text x="380" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#15803D">Sequential Traversal ({concept})</text>

  <!-- Array visual: [12 | 45 | 7 | 23 | 89] -->
  <g transform="translate(385, 95)">
    <rect x="0" y="0" width="50" height="35" rx="4" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.5" />
    <text x="25" y="22" font-family="monospace" font-size="12" font-weight="bold" fill="#1F2937" text-anchor="middle">12</text>
    <text x="25" y="48" font-family="sans-serif" font-size="10" fill="#6B7280" text-anchor="middle">i=0</text>

    <rect x="55" y="0" width="50" height="35" rx="4" fill="#FFFFFF" stroke="#16A34A" stroke-width="1.5" />
    <text x="80" y="22" font-family="monospace" font-size="12" font-weight="bold" fill="#1F2937" text-anchor="middle">45</text>
    <text x="80" y="48" font-family="sans-serif" font-size="10" fill="#6B7280" text-anchor="middle">i=1</text>

    <rect x="110" y="0" width="50" height="35" rx="4" fill="#DCFCE7" stroke="#16A34A" stroke-width="2" />
    <text x="135" y="22" font-family="monospace" font-size="12" font-weight="bold" fill="#15803D" text-anchor="middle">7</text>
    <text x="135" y="48" font-family="sans-serif" font-size="10" font-weight="bold" fill="#15803D" text-anchor="middle">Target!</text>

    <rect x="165" y="0" width="50" height="35" rx="4" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1" />
    <text x="190" y="22" font-family="monospace" font-size="12" fill="#9CA3AF" text-anchor="middle">23</text>
    <text x="190" y="48" font-family="sans-serif" font-size="10" fill="#9CA3AF" text-anchor="middle">i=3</text>

    <rect x="220" y="0" width="50" height="35" rx="4" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1" />
    <text x="245" y="22" font-family="monospace" font-size="12" fill="#9CA3AF" text-anchor="middle">89</text>
    <text x="245" y="48" font-family="sans-serif" font-size="10" fill="#9CA3AF" text-anchor="middle">i=4</text>
  </g>

  <!-- Step arrow -->
  <line x1="410" y1="82" x2="520" y2="82" stroke="#2563EB" stroke-width="2.5" marker-end="url(#arrowBlueDsa)" />
  <text x="465" y="76" font-family="system-ui, -apple-system, sans-serif" font-size="10" font-weight="bold" fill="#2563EB" text-anchor="middle">i = 0, 1, 2...</text>

  <rect x="385" y="165" width="275" height="26" rx="6" fill="#DCFCE7" />
  <text x="522" y="183" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#166534" text-anchor="middle">Time Complexity: O(n) worst / O(1) best</text>
  <text x="380" y="210" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#14532D">Examines each element sequentially until match is found.</text>
</svg>'''

    # Domain 2: Chemistry / Molecular
    if any(k in combined for k in ["chem", "bond", "atom", "molecule", "reaction", "acid", "electron", "orbital", "ion"]):
        return f'''<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <defs>
    <linearGradient id="gradWrongChem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF2F2" />
      <stop offset="100%" stop-color="#FEE2E2" />
    </linearGradient>
    <linearGradient id="gradRightChem" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4" />
      <stop offset="100%" stop-color="#DCFCE7" />
    </linearGradient>
  </defs>

  <rect x="20" y="20" width="315" height="220" rx="12" fill="url(#gradWrongChem)" stroke="#F87171" stroke-width="1.5" />
  <text x="35" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#991B1B">INTUITIVE FALLACY</text>
  <text x="35" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#B91C1C">"{label}"</text>
  <circle cx="120" cy="120" r="30" fill="#FEE2E2" stroke="#EF4444" stroke-width="2" />
  <text x="120" y="125" font-family="sans-serif" font-size="14" font-weight="bold" fill="#DC2626" text-anchor="middle">Atom A</text>
  <circle cx="230" cy="120" r="30" fill="#FEE2E2" stroke="#EF4444" stroke-width="2" />
  <text x="230" y="125" font-family="sans-serif" font-size="14" font-weight="bold" fill="#DC2626" text-anchor="middle">Atom B</text>
  <text x="35" y="190" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">Mistaken structural or bonding interpretation</text>

  <rect x="365" y="20" width="315" height="220" rx="12" fill="url(#gradRightChem)" stroke="#4ADE80" stroke-width="1.5" />
  <text x="380" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#166534">SCIENTIFIC REALITY</text>
  <text x="380" y="68" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#15803D">Molecular Principle ({concept})</text>
  <circle cx="480" cy="120" r="32" fill="#DCFCE7" stroke="#16A34A" stroke-width="2" />
  <circle cx="560" cy="120" r="32" fill="#DCFCE7" stroke="#16A34A" stroke-width="2" />
  <text x="475" y="125" font-family="sans-serif" font-size="13" font-weight="bold" fill="#166534" text-anchor="middle">Core</text>
  <text x="565" y="125" font-family="sans-serif" font-size="13" font-weight="bold" fill="#166534" text-anchor="middle">Core</text>
  <ellipse cx="520" cy="120" rx="14" ry="24" fill="#BBF7D0" stroke="#15803D" stroke-width="1.5" stroke-dasharray="2" />
  <text x="520" y="124" font-family="sans-serif" font-size="10" font-weight="bold" fill="#166534" text-anchor="middle">e- e-</text>
  <text x="380" y="190" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#14532D">Electrostatic balance and electron sharing/transfer</text>
</svg>'''

    # Domain 3: Physics (Force / Motion / Gravity)
    if any(k in combined for k in ["newton", "kinematics", "gravity", "gravit", "inertia", "physics"]) or ("force" in combined and any(k in combined for k in ["acceleration", "motion", "mass", "net force"])):
        return f'''<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <defs>
    <linearGradient id="gradWrongPhys" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF2F2" />
      <stop offset="100%" stop-color="#FEE2E2" />
    </linearGradient>
    <linearGradient id="gradRightPhys" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4" />
      <stop offset="100%" stop-color="#DCFCE7" />
    </linearGradient>
    <marker id="arrowRedPhys" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill="#DC2626" />
    </marker>
    <marker id="arrowBluePhys" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M 0 0 L 8 4 L 0 8 Z" fill="#2563EB" />
    </marker>
  </defs>

  <rect x="20" y="20" width="315" height="220" rx="12" fill="url(#gradWrongPhys)" stroke="#F87171" stroke-width="1.5" />
  <text x="35" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#991B1B">INTUITIVE FALLACY</text>
  <text x="35" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#B91C1C">"{label}"</text>

  <rect x="45" y="105" width="70" height="45" rx="6" fill="#FFFFFF" stroke="#EF4444" stroke-width="2" />
  <text x="80" y="132" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#374151" text-anchor="middle">Object</text>
  <line x1="120" y1="128" x2="205" y2="128" stroke="#DC2626" stroke-width="3" marker-end="url(#arrowRedPhys)" />
  <text x="162" y="118" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#DC2626" text-anchor="middle">Force Needed?</text>
  <line x1="157" y1="105" x2="169" y2="135" stroke="#DC2626" stroke-width="3" />
  <line x1="169" y1="105" x2="157" y2="135" stroke="#DC2626" stroke-width="3" />
  <text x="35" y="190" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">Mistaken Belief: A continuous push is required</text>
  <text x="35" y="208" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">just to maintain steady, constant motion.</text>

  <rect x="365" y="20" width="315" height="220" rx="12" fill="url(#gradRightPhys)" stroke="#4ADE80" stroke-width="1.5" />
  <text x="380" y="50" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#166534">SCIENTIFIC REALITY</text>
  <text x="380" y="72" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#15803D">Newtonian Principle ({concept})</text>

  <rect x="390" y="105" width="70" height="45" rx="6" fill="#FFFFFF" stroke="#22C55E" stroke-width="2" />
  <text x="425" y="132" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#374151" text-anchor="middle">Object</text>
  <line x1="465" y1="128" x2="550" y2="128" stroke="#2563EB" stroke-width="3" stroke-dasharray="4" marker-end="url(#arrowBluePhys)" />
  <text x="507" y="118" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="bold" fill="#2563EB" text-anchor="middle">v = constant</text>
  <rect x="400" y="168" width="245" height="26" rx="6" fill="#DCFCE7" />
  <text x="522" y="186" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#166534" text-anchor="middle">F_net = 0 (No continuous force!)</text>
  <text x="380" y="215" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#14532D">Net force produces acceleration, not velocity.</text>
</svg>'''

    # Domain 4: Default / General Concept
    return f'''<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" class="w-full h-auto">
  <defs>
    <linearGradient id="gradWrongGen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FEF2F2" />
      <stop offset="100%" stop-color="#FEE2E2" />
    </linearGradient>
    <linearGradient id="gradRightGen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F0FDF4" />
      <stop offset="100%" stop-color="#DCFCE7" />
    </linearGradient>
  </defs>

  <rect x="20" y="20" width="315" height="220" rx="12" fill="url(#gradWrongGen)" stroke="#F87171" stroke-width="1.5" />
  <text x="35" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#991B1B">INTUITIVE FALLACY</text>
  <text x="35" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#B91C1C">"{label}"</text>
  <rect x="45" y="95" width="265" height="50" rx="6" fill="#FFFFFF" stroke="#EF4444" stroke-width="1.5" />
  <text x="177" y="125" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#B91C1C" text-anchor="middle">Common Intuitive Assumption</text>
  <text x="35" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#7F1D1D">Mistaken inference based on incomplete information.</text>

  <rect x="365" y="20" width="315" height="220" rx="12" fill="url(#gradRightGen)" stroke="#4ADE80" stroke-width="1.5" />
  <text x="380" y="48" font-family="system-ui, -apple-system, sans-serif" font-size="13" font-weight="700" fill="#166534">RIGOROUS CONCEPT</text>
  <text x="380" y="70" font-family="system-ui, -apple-system, sans-serif" font-size="12" fill="#15803D">{concept}</text>
  <rect x="390" y="95" width="265" height="50" rx="6" fill="#FFFFFF" stroke="#22C55E" stroke-width="1.5" />
  <text x="522" y="125" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="bold" fill="#166534" text-anchor="middle">Formal Ground Truth Principle</text>
  <text x="380" y="185" font-family="system-ui, -apple-system, sans-serif" font-size="11" fill="#14532D">Verified standard definitions and principles apply.</text>
</svg>'''


class LLMClient:
    """
    Unified client providing resilient LLM completion via OpenRouter Auto-Rotating Pool,
    with transparent Mock fallback for testing and offline development.
    """

    def __init__(
        self,
        mock_provider: Optional[LLMProvider] = None,
        force_mode: Optional[str] = None,
    ):
        self.mode = force_mode or settings.LLM_MODE

        self.mock_provider = mock_provider or MockProvider()
        
        # Use OpenRouter for all calls, but allow routing based on task
        api_keys = settings.OPEN_ROUTER_API or settings.OPENROUTER_API_KEY
        
        self.diagnostic_provider = OpenRouterPoolProvider(
            api_keys_str=api_keys,
            model=settings.OPENROUTER_DIAGNOSTIC_MODEL,
        )
        self.remediation_provider = OpenRouterPoolProvider(
            api_keys_str=api_keys,
            model=settings.OPENROUTER_REMEDIATION_MODEL,
        )

    async def complete(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = True,
        temperature: float = 0.2,
        preferred_provider: Optional[str] = None,
    ) -> LLMResponse:
        """
        Executes completion using OpenRouter multi-key pool.
        """
        if self.mode == "mock":
            return await self.mock_provider.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
                temperature=temperature,
            )

        provider = self.remediation_provider if preferred_provider == "gemini" else self.diagnostic_provider

        try:
            return await provider.complete(
                prompt=prompt,
                system_prompt=system_prompt,
                json_mode=json_mode,
                temperature=temperature,
            )
        except LLMProviderError as err:
            logger.error("OpenRouter provider '%s' failed: %s", provider.model_name, err.message)
            if settings.ENVIRONMENT == "development" or not (settings.OPEN_ROUTER_API or settings.OPENROUTER_API_KEY):
                logger.info("Engaging MockProvider as ultimate development fallback.")
                return await self.mock_provider.complete(
                    prompt=prompt,
                    system_prompt=system_prompt,
                    json_mode=json_mode,
                    temperature=temperature,
                )
            raise err

    async def propose_hypotheses(
        self,
        question: Question,
        selected_option: str,
        confidence: int,
    ) -> HypothesisProposalResponse:
        """Calls LLM to propose candidate misconception hypotheses for an incorrect student answer."""
        formatted_options = "\n".join(f"{k}: {v}" for k, v in question.options.items())
        prompt = USER_PROMPT_HYPOTHESIS_GENERATION.format(
            topic=question.topic,
            concept=question.concept,
            question_text=question.question_text,
            options_formatted=formatted_options,
            correct_option=question.correct_option,
            selected_option=selected_option,
            confidence=confidence,
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_HYPOTHESIS_GENERATION,
            json_mode=True,
        )

        try:
            data = json.loads(response.content)
            return HypothesisProposalResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse hypothesis proposal JSON: %s. Response content: %s", exc, response.content)
            # Return deterministic fallback hypothesis
            return HypothesisProposalResponse(
                hypotheses=[
                    {
                        "id": question.distractor_misconceptions.get(selected_option, "conceptual_misunderstanding"),
                        "label": "Identified Distractor Misconception",
                        "initial_probability": 0.5,
                        "predicted_wrong_options": [selected_option],
                        "reason": f"Selected distractor {selected_option} maps to this misconception.",
                    },
                    {
                        "id": "careless_or_calculation_error",
                        "label": "Calculation or Reading Error",
                        "initial_probability": 0.25,
                        "predicted_wrong_options": [],
                        "reason": "Alternative hypothesis that student misread or calculated incorrectly.",
                    },
                    {
                        "id": "formula_confusion",
                        "label": "Formula Confusion",
                        "initial_probability": 0.25,
                        "predicted_wrong_options": [],
                        "reason": "Alternative hypothesis that student applied the incorrect formula.",
                    }
                ]
            )

    async def generate_remediation(
        self,
        misconception_id: str,
        misconception_label: str,
        misconception_description: str,
        concept: str,
        evidence_summary: str,
        reference_material: Optional[str] = None,
    ) -> RemediationResponse:
        """Calls LLM to synthesize targeted conceptual remediation with multi-modal artifacts."""
        prompt = USER_PROMPT_REMEDIATION.format(
            concept=concept,
            misconception_id=misconception_id,
            misconception_label=misconception_label,
            misconception_description=misconception_description or misconception_label,
            evidence_summary=evidence_summary,
            reference_context=f"\n{reference_material}\n" if reference_material else "",
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_REMEDIATION,
            json_mode=True,
            preferred_provider="gemini",
        )

        # Dynamic educational video search via YouTube API v3 (or curated physics fallback)
        dynamic_video = await search_youtube_video(concept, misconception_label)

        # Domain-aware adaptive fallbacks
        combined_topic = f"{concept} {misconception_id} {misconception_label}".lower()
        if any(k in combined_topic for k in ["search", "array", "list", "sort", "tree", "graph", "dsa", "pointer", "binary", "algorithm", "loop", "index"]):
            fallback_feynman = (
                f"Think of searching for your favorite shirt in an unsorted pile of clothes. "
                f"You cannot just magically guess where it is; you have to pick up the top shirt, inspect if it matches, "
                f"and move to the next one. That is sequential search: checking index by index until a match is found."
            )
            fallback_remediation = (
                f"When searching through an unsorted collection ({concept}), each element must be checked sequentially. "
                f"Assuming items can be found without traversal overlooks the fundamental nature of array storage."
            )
            fallback_takeaway = "In an unsorted array, linear search runs in O(n) worst-case time because each element is inspected sequentially."
            fallback_check = "If you have an unsorted list of 50 items and the target is at index 40, how many elements must be checked before finding it?"
        elif any(k in combined_topic for k in ["chem", "bond", "atom", "molecule", "reaction", "acid", "electron", "orbital"]):
            fallback_feynman = (
                f"Think of sharing a toy between two friends. In covalent bonding, atoms share valence electrons "
                f"so both achieve the stability of a complete outer electron shell."
            )
            fallback_remediation = (
                f"In chemical bonding ({concept}), focus on electron configurations and electrostatic interactions rather than simplistic rules."
            )
            fallback_takeaway = "Bonding occurs to minimize potential energy and achieve stable valence electron shells."
        elif any(k in combined_topic for k in ["newton", "kinematics", "gravity", "gravit", "inertia", "physics"]) or ("force" in combined_topic and any(k in combined_topic for k in ["acceleration", "motion", "mass", "net force"])):
            fallback_feynman = (
                f"Think of it like an air-hockey puck gliding on a super slick table. Once you give it a tap, "
                f"it keeps sliding effortlessly on its own—you don't have to keep pushing it! "
                f"In physics, a force is only needed to CHANGE speed or direction (acceleration), not to maintain motion."
            )
            fallback_remediation = (
                f"You have been focusing on {misconception_label}. In science, remember that "
                f"net force causes acceleration (F=ma), not constant velocity."
            )
            fallback_takeaway = "If velocity is constant, acceleration is zero, and net force is zero."
            fallback_check = "Does an object moving at 100 m/s in frictionless space need a continuous force?"
        else:
            fallback_feynman = (
                f"Break {concept} down to first principles: examine what is known, question intuitive assumptions, "
                f"and apply the core rule step-by-step."
            )
            fallback_remediation = (
                f"Reframing {concept}: consider the underlying definition and contrast it with intuitive shortcuts."
            )
            fallback_takeaway = f"Mastering {concept} requires distinguishing surface intuition from rigorous principles."
            fallback_check = f"Can you explain why {misconception_label} does not always hold true?"

        try:
            # Clean potential markdown backticks before parsing
            raw_content = response.content.strip()
            if raw_content.startswith("```json"):
                raw_content = raw_content[7:]
            if raw_content.startswith("```"):
                raw_content = raw_content[3:]
            if raw_content.endswith("```"):
                raw_content = raw_content[:-3]
            raw_content = raw_content.strip()

            data = json.loads(raw_content)
            
            # Remove hardcoded SVG fallback
            # We ONLY want the LLM's dynamically generated SVG
            
            # Use dynamic video if response has invalid or missing video
            resp_video = data.get("video_snippet")
            if resp_video and isinstance(resp_video, dict) and resp_video.get("youtube_video_id") and resp_video.get("youtube_video_id") != "5omYJ0xQW6A":
                data["video_snippet"] = resp_video
            elif dynamic_video:
                data["video_snippet"] = dynamic_video.dict()
            else:
                data["video_snippet"] = None

            return RemediationResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse remediation JSON: %s. Response content: %s", exc, response.content)
            return RemediationResponse(
                misconception_id=misconception_id,
                remediation_title=f"Understanding {concept}",
                remediation_text=fallback_remediation,
                key_takeaway=fallback_takeaway,
                check_for_understanding=fallback_check,
                feynman_explanation=fallback_feynman,
                visual_artifact_svg=None,  # No hardcoded visualization!
                video_snippet=dynamic_video,
            )

    async def generate_question(
        self,
        topic: str,
        concept: Optional[str] = None,
        difficulty: str = "medium",
        target_misconceptions: Optional[str] = None,
        is_followup: bool = False,
    ) -> Optional[Question]:
        """
        Generates a diagnostic multiple-choice question where distractors map to misconceptions.
        Routes to OpenRouter as the preferred provider.
        """
        import uuid
        concept_str = concept or topic
        prefix = topic.lower().replace(" ", "_").replace("'", "")[:12]
        if target_misconceptions:
            targets_desc = target_misconceptions
        else:
            combined_q = f"{topic} {concept_str}".lower()
            if any(k in combined_q for k in ["search", "array", "list", "sort", "tree", "graph", "dsa", "pointer", "binary", "algorithm", "loop", "index"]):
                targets_desc = (
                    f"- index_out_of_bounds_confusion: Believes searching beyond array size or indexing errors in {topic}.\n"
                    f"- unsorted_binary_search_fallacy: Believes binary search or instant halving works on unsorted lists without sequential traversal.\n"
                    f"- early_exit_omission: Assumes linear search always checks the entire array even when target is found at the start."
                )
            elif any(k in combined_q for k in ["chem", "bond", "atom", "molecule", "reaction", "acid", "electron"]):
                targets_desc = (
                    f"- ionic_covalent_confusion: Confuses electron transfer with electron sharing.\n"
                    f"- octet_rule_infallibility: Believes octet rule applies unconditionally to all elements without exception.\n"
                    f"- bond_breaking_energy_misconception: Believes breaking chemical bonds releases energy rather than requiring energy input."
                )
            elif any(k in combined_q for k in ["force", "motion", "newton", "velocity", "accel", "gravit", "frict", "physic"]):
                targets_desc = (
                    f"- force_causes_motion: Believes constant velocity requires constant net force.\n"
                    f"- force_acceleration_confusion: Confuses velocity with acceleration in Newton's second law.\n"
                    f"- action_reaction_cancellation: Believes third law forces cancel each other out on the same object."
                )
            else:
                targets_desc = (
                    f"- intuitive_misconception: Common everyday misconception about {concept_str}.\n"
                    f"- rule_overgeneralization: Overgeneralizing a specific rule in {topic} beyond its valid conditions.\n"
                    f"- causal_inversion: Inverting cause and effect in {concept_str}."
                )

        # Include random seed to guarantee a completely new question text every time
        random_seed = uuid.uuid4().hex[:8]
        seed_instruction = f" Ensure this is a COMPLETELY NEW and UNIQUE question text that hasn't been asked yet. Random seed: {random_seed}."

        prompt = USER_PROMPT_QUESTION_GENERATION.format(
            topic=topic,
            concept=concept_str,
            difficulty=difficulty,
            target_misconceptions=targets_desc,
            question_id_prefix=f"{prefix}_q",
            prerequisite=f"Introductory {topic}",
        ) + seed_instruction

        try:
            response = await self.complete(
                prompt=prompt,
                system_prompt=SYSTEM_PROMPT_QUESTION_GENERATION,
                json_mode=True,
                preferred_provider="diagnostic",
            )
            raw = json.loads(response.content)
            if isinstance(raw, list) and raw:
                raw = raw[0]
            elif isinstance(raw, dict) and "question" in raw and isinstance(raw["question"], dict):
                raw = raw["question"]
            elif isinstance(raw, dict) and "questions" in raw and isinstance(raw["questions"], list) and raw["questions"]:
                raw = raw["questions"][0]

            q_id = f"{prefix}_gen_{uuid.uuid4().hex[:8]}"

            # Strictly sanitize options to only A, B, C, D keys
            raw_options = raw.get("options") or {}
            cleaned_options = {}
            for k, v in raw_options.items():
                k_clean = str(k).strip().upper()
                if k_clean in ["A", "B", "C", "D"] and isinstance(v, str):
                    cleaned_options[k_clean] = v.strip()

            if len(cleaned_options) < 4:
                for opt_key in ["A", "B", "C", "D"]:
                    if opt_key not in cleaned_options:
                        cleaned_options[opt_key] = f"Option {opt_key}"

            correct_opt = str(raw.get("correct_option") or "B").strip().upper()
            if correct_opt not in ["A", "B", "C", "D"]:
                correct_opt = "B"

            raw_distractors = raw.get("distractor_misconceptions") or {}
            cleaned_distractors = {}
            for k, v in raw_distractors.items():
                k_clean = str(k).strip().upper()
                if k_clean in ["A", "B", "C", "D"] and k_clean != correct_opt:
                    cleaned_distractors[k_clean] = str(v)

            return Question(
                id=q_id,
                concept=raw.get("concept") or concept_str,
                topic=raw.get("topic") or topic,
                prerequisite=raw.get("prerequisite") or f"Introductory {topic}",
                difficulty=raw.get("difficulty") or difficulty,
                question_type="followup" if is_followup else "diagnostic",
                question_text=raw.get("question_text") or f"Diagnostic assessment on {concept_str}",
                options=cleaned_options,
                correct_option=correct_opt,
                distractor_misconceptions=cleaned_distractors or {
                    k: f"misconception_{k.lower()}" for k in ["A", "B", "C", "D"] if k != correct_opt
                },
                diagnostic_targets=raw.get("diagnostic_targets") or list(cleaned_distractors.values()),
                explanation=raw.get("explanation") or f"Correct understanding of {concept_str}",
            )
        except Exception as exc:
            logger.error("Failed to generate question via Groq: %s", exc)
            return None

    async def simulate_student(
        self,
        misconception_id: str,
        misconception_label: str,
        misconception_description: str,
        question: Question,
    ) -> SelfConsistencyResponse:
        """
        Runs the self-consistency simulation:
        Prompts LLM to roleplay a student holding this specific misconception and predict their option.
        """
        # In mock mode, deterministically predict the distractor matching this misconception on this question
        if self.mode == "mock":
            predicted = None
            for opt, misc in question.distractor_misconceptions.items():
                if misc == misconception_id:
                    predicted = opt
                    break
            if predicted:
                return SelfConsistencyResponse(
                    predicted_option=predicted,
                    reasoning_summary=f"Simulated student applying {misconception_label} chooses Option {predicted}.",
                    confidence=0.88,
                )

        formatted_options = "\n".join(f"{k}: {v}" for k, v in question.options.items())
        prompt = USER_PROMPT_SELF_CONSISTENCY.format(
            misconception_id=misconception_id,
            misconception_label=misconception_label,
            misconception_description=misconception_description or misconception_label,
            question_text=question.question_text,
            options_formatted=formatted_options,
        )

        response = await self.complete(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT_SELF_CONSISTENCY,
            json_mode=True,
        )

        try:
            data = json.loads(response.content)
            return SelfConsistencyResponse(**data)
        except Exception as exc:
            logger.error("Failed to parse self-consistency JSON: %s", exc)
            # Default to distractor matching this misconception if present
            predicted = "A"
            for opt, misc in question.distractor_misconceptions.items():
                if misc == misconception_id:
                    predicted = opt
                    break
            return SelfConsistencyResponse(
                predicted_option=predicted,
                reasoning_summary=f"Simulated student applying {misconception_label} chooses {predicted}.",
                confidence=0.8,
            )

    async def describe_image(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: Optional[str] = None,
    ) -> str:
        """
        Generates an educational caption/description for an image or diagram using multimodal LLM or fallback.
        """
        prompt_text = prompt or (
            "Describe this diagram or figure clearly and concisely for an educational study guide, "
            "focusing on key scientific principles, labels, and concepts illustrated."
        )

        if self.mode == "mock":
            return await self.mock_provider.describe_image(image_bytes, mime_type, prompt_text)

        # 1. Try Gemini (multimodal vision)
        try:
            if (settings.OPEN_ROUTER_API or settings.OPENROUTER_API_KEY) and hasattr(self.remediation_provider, "describe_image"):
                return await self.remediation_provider.describe_image(image_bytes, mime_type, prompt_text)
        except Exception as exc:
            logger.warning("Gemini vision description failed: %s", exc)

        # 2. Fallback to mock
        return await self.mock_provider.describe_image(image_bytes, mime_type, prompt_text)

    def describe_image_sync(
        self,
        image_bytes: bytes,
        mime_type: str = "image/png",
        prompt: Optional[str] = None,
    ) -> str:
        """Synchronous runner for describe_image."""
        import asyncio
        import concurrent.futures

        coro = self.describe_image(image_bytes=image_bytes, mime_type=mime_type, prompt=prompt)
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop and loop.is_running():
            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                return pool.submit(asyncio.run, coro).result()
        else:
            return asyncio.run(coro)


# Default client instance
default_llm_client = LLMClient()

