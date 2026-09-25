"""
Embedding provider abstraction for RAG text vectorization.
"""

from typing import List
import hashlib
import numpy as np


class EmbeddingProvider:
    """
    Provides vector embeddings for chunks and queries.
    Uses ChromaDB default embedding function or lightweight deterministic fallback.
    """

    def __init__(self, provider_type: str = "default"):
        self.provider_type = provider_type
        self._ef = None
        self._init_provider()

    def _init_provider(self):
        try:
            import chromadb.utils.embedding_functions as ef
            self._ef = ef.DefaultEmbeddingFunction()
        except Exception as e:
            # Fallback to deterministic pseudo-embedding if ONNX/models are not yet downloaded
            self._ef = None

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []

        if self._ef is not None:
            try:
                embeddings = self._ef(texts)
                return [[float(x) for x in e] for e in embeddings]
            except Exception:
                pass

        # Deterministic lightweight fallback (384-dimensional vector from SHA256)
        return [[float(x) for x in self._deterministic_hash_vector(t)] for t in texts]

    def embed_query(self, query: str) -> List[float]:
        return self.embed_texts([query])[0]

    def _deterministic_hash_vector(self, text: str, dim: int = 384) -> List[float]:
        """
        Creates a consistent, normalized unit vector for testing/offline fallback.
        """
        seed = int(hashlib.md5(text.encode("utf-8")).hexdigest()[:8], 16)
        rng = np.random.RandomState(seed)
        vec = rng.randn(dim).astype(np.float32)
        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec.tolist()


default_embedding_provider = EmbeddingProvider()
