from enum import StrEnum


class MusicSourceStrategy(StrEnum):
    REMOTE_URL = "remote_url"
    LOCAL_MEDIA = "local_media"
    S3_MEDIA = "s3_media"
