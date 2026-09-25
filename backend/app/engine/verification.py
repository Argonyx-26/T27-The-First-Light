"""
Deterministic Verification Engine for Misconception Mapper (MM).
Evaluates whether a student has resolved or retained a previously diagnosed misconception
using a different-form verification question.
"""

from app.engine.models import Question, QuestionType, VerificationResult, VerificationStatus


def evaluate_verification(
    original_misconception_id: str,
    verification_question: Question,
    selected_option: str,
) -> VerificationResult:
    """
    Evaluates student performance on a different-form verification question.

    Returns:
    - VerificationStatus.RESOLVED if the student answered correctly, demonstrating
      conceptual repair on the target concept.
    - VerificationStatus.PERSISTENT if the student answered incorrectly, indicating
      the misconception remains active or a related error occurred.
    """
    if not original_misconception_id or not original_misconception_id.strip():
        raise ValueError("original_misconception_id cannot be empty")

    if selected_option not in verification_question.options:
        raise ValueError(
            f"Selected option '{selected_option}' is not valid for question '{verification_question.id}'. "
            f"Valid options: {list(verification_question.options.keys())}"
        )

    # Check correctness
    is_correct = (selected_option == verification_question.correct_option)
    chosen_distractor_misc = verification_question.distractor_misconceptions.get(selected_option)

    if is_correct:
        status = VerificationStatus.RESOLVED
        feedback = (
            f"Verification successful. The student correctly answered '{selected_option}', "
            f"demonstrating that misconception '{original_misconception_id}' on concept "
            f"'{verification_question.concept}' has been resolved."
        )
    else:
        status = VerificationStatus.PERSISTENT
        if chosen_distractor_misc == original_misconception_id:
            feedback = (
                f"Verification failed. The student selected option '{selected_option}', "
                f"which directly manifests the persistent misconception '{original_misconception_id}'."
            )
        else:
            feedback = (
                f"Verification failed. The student selected option '{selected_option}' "
                f"(correct was '{verification_question.correct_option}'). The misconception "
                f"'{original_misconception_id}' remains unresolved."
            )

    return VerificationResult(
        status=status,
        is_correct=is_correct,
        misconception_id=original_misconception_id,
        selected_option=selected_option,
        correct_option=verification_question.correct_option,
        feedback=feedback,
    )
