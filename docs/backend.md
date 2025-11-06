# Backend plan — ER diagram mapping and API suggestions

This document maps the attached ER diagram (tables: user, user_analysis_settings, video, feature, video_tag, fall_detection, feature_fall_detection) to a simple REST API design and JSON shapes. Use this as a starting point when implementing the backend.

## Tables (summary)
- user: id (PK), username, birth_date, password_hash, created_at
- user_analysis_settings: user_id (PK,FK), frame_interval, notification_enabled
- video: id (PK), user_id (FK), filename, original_filename, upload_date
- feature: id (PK), video_id (FK), frame_number, landmarks, timestamp
- video_tag: id (PK), video_id (FK), tag_name, created_at
- fall_detection: id (PK), video_id (FK), is_fall_detected, confidence, fall_frame_number, analysis_details, created_at
- feature_fall_detection: (feature_id, fall_detection_id) PKs, contribution_weight

## Suggested REST endpoints
(Authenticate users with session/JWT; below endpoints assume authenticated requests where required)

- Users
  - GET /api/users — list users (admin)
  - POST /api/users — create user (body: username, birth_date, password)
  - GET /api/users/:id
  - PUT /api/users/:id
  - DELETE /api/users/:id

- User settings
  - GET /api/users/:userId/settings
  - PUT /api/users/:userId/settings

- Videos
  - GET /api/videos — list videos (query: userId, tag, page)
  - POST /api/videos — upload metadata (or multipart upload)
  - GET /api/videos/:id
  - DELETE /api/videos/:id

- Video tags
  - GET /api/videos/:id/tags
  - POST /api/videos/:id/tags
  - DELETE /api/videos/:id/tags/:tagId

- Features (frame-level detections)
  - GET /api/videos/:id/features?frame=123
  - POST /api/videos/:id/features (bulk insert)

- Fall detections
  - GET /api/videos/:id/fall-detections
  - POST /api/videos/:id/fall-detections
  - GET /api/fall-detections/:id

- Feature-Fall mappings
  - POST /api/fall-detections/:id/features (list of {feature_id, contribution_weight})

## JSON payload examples
- POST /api/videos
{
  "user_id": 1,
  "filename": "v-abc.mp4",
  "original_filename": "user_upload.mp4",
  "upload_date": "2025-11-06T10:00:00Z"
}

- POST /api/fall-detections
{
  "video_id": 10,
  "is_fall_detected": true,
  "confidence": 0.94,
  "fall_frame_number": 512,
  "analysis_details": "{...}"  // optional text/JSON
}

## Notes / Implementation guidance
- Use pagination for large `feature` or `fall_detection` query results.
- Store large binary assets (videos) in object storage (S3, GCS) and store only metadata/paths in DB.
- For ML model outputs (feature.landmarks, analysis_details) consider storing JSON/JSONB (Postgres) or compressed blobs.
- Index common query columns: video.user_id, feature.video_id, fall_detection.video_id, created_at fields.
- Consider background workers for heavy processing (frame extraction, feature extraction) and expose status endpoints.

If you want, I can scaffold a minimal Express + SQLite backend with these endpoints and wire the current frontend to it (mock auth + simple CRUD). Tell me the stack you prefer and I will scaffold it.
