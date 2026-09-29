import enum


class UserRole(str, enum.Enum):
    STUDENT = "STUDENT"
    STAFF = "STAFF"
    GATE_OFFICER = "GATE_OFFICER"
    ADMIN = "ADMIN"


class DeviceType(str, enum.Enum):
    LAPTOP = "LAPTOP"
    TABLET = "TABLET"
    PHONE = "PHONE"
    CAMERA = "CAMERA"
    MONITOR = "MONITOR"
    OTHER = "OTHER"


class DeviceStatus(str, enum.Enum):
    INSIDE_CAMPUS = "INSIDE_CAMPUS"
    OUTSIDE_CAMPUS = "OUTSIDE_CAMPUS"
    LOST = "LOST"
    REPORTED_LOST = "REPORTED_LOST"


class MovementType(str, enum.Enum):
    CHECK_IN = "CHECK_IN"
    CHECK_OUT = "CHECK_OUT"


class IncidentType(str, enum.Enum):
    LOST_DEVICE = "LOST_DEVICE"
    OWNER_MISMATCH = "OWNER_MISMATCH"
    UNAUTHORIZED_EXIT = "UNAUTHORIZED_EXIT"
    OTHER = "OTHER"


class IncidentStatus(str, enum.Enum):
    OPEN = "OPEN"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
