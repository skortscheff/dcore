from app.models.models import LifecycleState

ALLOWED_TRANSITIONS: dict[LifecycleState, list[LifecycleState]] = {
    LifecycleState.proposed:    [LifecycleState.design],
    LifecycleState.design:      [LifecycleState.approved, LifecycleState.proposed],
    LifecycleState.approved:    [LifecycleState.build, LifecycleState.design],
    LifecycleState.build:       [LifecycleState.deployment, LifecycleState.approved],
    LifecycleState.deployment:  [LifecycleState.operational, LifecycleState.build],
    LifecycleState.operational: [LifecycleState.maintenance, LifecycleState.at_risk, LifecycleState.retiring],
    LifecycleState.maintenance: [LifecycleState.operational, LifecycleState.at_risk],
    LifecycleState.at_risk:     [LifecycleState.operational, LifecycleState.retiring],
    LifecycleState.retiring:    [LifecycleState.retired],
    LifecycleState.retired:     [],
}


def is_valid_transition(current: LifecycleState, target: LifecycleState) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, [])


def allowed_next_states(current: LifecycleState) -> list[LifecycleState]:
    return ALLOWED_TRANSITIONS.get(current, [])
