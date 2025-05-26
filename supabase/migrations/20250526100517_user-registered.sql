select pgmq.create('user_new');

create or replace function user_private_insert()
returns trigger
security definer
as $$
begin
    perform pgmq.send(
      queue_name => 'user_new'::text,
      msg        => jsonb_build_object('userId', new.id)
    );

    insert into private.users (user_id)
    values (new.id);

    return new;
end;
$$ language plpgsql;
