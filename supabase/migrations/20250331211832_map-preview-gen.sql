SELECT pgmq.drop_queue('new-plan');
SELECT pgmq.drop_queue('coords-activity');
SELECT pgmq.create('plan_map_gen');
SELECT pgmq.create('route_map_gen');
SELECT pgmq.create('plan_new');
