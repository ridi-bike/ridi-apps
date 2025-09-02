-- name: SendMessage :exec
SELECT * from pgmq.send(
  queue_name => sqlc.arg(queue_name)::text,
  msg        => sqlc.arg(message)::jsonb
);

-- name: ReadMessages :many
SELECT
    msg_id::bigint,
    read_ct::integer,
    enqueued_at::timestamp,
    vt::timestamp as visibility_timeout,
    message:: jsonb
FROM pgmq.read_with_poll(
  queue_name        => sqlc.arg(queue_name)::text,
  vt                => sqlc.arg(visibility_timeout_seconds)::integer,
  qty               => sqlc.arg(qty)::integer,
  max_poll_seconds  => sqlc.arg(max_poll_seconds)::integer,
	poll_interval_ms 	=> sqlc.arg(poll_interval_ms)::integer
);

-- name: ArchiveMessage :exec
SELECT pgmq.archive(
  queue_name => sqlc.arg(queue_name)::text,
  msg_id     => sqlc.arg(message_id)::bigint
);

-- name: ArchiveMessages :exec
SELECT pgmq.archive(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_ids)::bigint[]
);

-- name: DeleteMessage :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_id     => sqlc.arg(message_id)::bigint
);

-- name: DeleteMessages :exec
SELECT pgmq.delete(
  queue_name => sqlc.arg(queue_name)::text,
  msg_ids    => sqlc.arg(message_id)::bigint[]
);

-- name: UpdateVisibilityTimeout :one
SELECT
    msg_id::bigint,
    read_ct::integer,
    enqueued_at::timestamp,
    vt::timestamp as visibility_timeout,
    message:: jsonb
FROM pgmq.set_vt(
  sqlc.arg(queue_name)::text,
  sqlc.arg(message_id)::bigint,
  sqlc.arg(visibility_timeout_seconds)::integer
);
