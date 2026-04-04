-- public.problems definition

-- Drop table

-- DROP TABLE public.problems;

CREATE TABLE public.problems (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	frontend_id int4 NOT NULL,
	title varchar(300) NOT NULL,
	slug varchar(300) NOT NULL,
	difficulty varchar(10) NOT NULL,
	description text NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT ck_problems_difficulty CHECK (((difficulty)::text = ANY ((ARRAY['Easy'::character varying, 'Medium'::character varying, 'Hard'::character varying])::text[]))),
	CONSTRAINT problems_frontend_id_key UNIQUE (frontend_id),
	CONSTRAINT problems_pkey PRIMARY KEY (id),
	CONSTRAINT problems_problem_id_key UNIQUE (problem_id),
	CONSTRAINT problems_slug_key UNIQUE (slug)
);


-- public.topics definition

-- Drop table

-- DROP TABLE public.topics;

CREATE TABLE public.topics (
	id serial4 NOT NULL,
	"name" varchar(100) NOT NULL,
	slug varchar(100) NOT NULL,
	CONSTRAINT topics_name_key UNIQUE (name),
	CONSTRAINT topics_pkey PRIMARY KEY (id),
	CONSTRAINT topics_slug_key UNIQUE (slug)
);


-- public.users definition

-- Drop table

-- DROP TABLE public.users;

CREATE TABLE public.users (
	id serial4 NOT NULL,
	username varchar(50) NOT NULL,
	email varchar(255) NOT NULL,
	hashed_password varchar(255) NOT NULL,
	is_active bool NOT NULL,
	is_admin bool NOT NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_pkey PRIMARY KEY (id),
	CONSTRAINT users_username_key UNIQUE (username)
);


-- public.code_snippets definition

-- Drop table

-- DROP TABLE public.code_snippets;

CREATE TABLE public.code_snippets (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	"language" varchar(30) NOT NULL,
	code text NOT NULL,
	CONSTRAINT code_snippets_pkey PRIMARY KEY (id),
	CONSTRAINT uq_code_snippets_problem_lang UNIQUE (problem_id, language),
	CONSTRAINT code_snippets_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.examples definition

-- Drop table

-- DROP TABLE public.examples;

CREATE TABLE public.examples (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	example_num int4 NOT NULL,
	example_text text NOT NULL,
	images jsonb NOT NULL,
	CONSTRAINT examples_pkey PRIMARY KEY (id),
	CONSTRAINT uq_examples_problem_example_num UNIQUE (problem_id, example_num),
	CONSTRAINT examples_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_constraints definition

-- Drop table

-- DROP TABLE public.problem_constraints;

CREATE TABLE public.problem_constraints (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	sort_order int4 NOT NULL,
	constraint_text text NOT NULL,
	CONSTRAINT problem_constraints_pkey PRIMARY KEY (id),
	CONSTRAINT uq_problem_constraints_problem_sort_order UNIQUE (problem_id, sort_order),
	CONSTRAINT problem_constraints_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_drivers definition

-- Drop table

-- DROP TABLE public.problem_drivers;

CREATE TABLE public.problem_drivers (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	"language" varchar(30) NOT NULL,
	prefix_code text DEFAULT ''::text NOT NULL,
	driver_code text NOT NULL,
	judge0_language_id int4 NOT NULL,
	CONSTRAINT problem_drivers_pkey PRIMARY KEY (id),
	CONSTRAINT uq_problem_drivers_problem_lang UNIQUE (problem_id, language),
	CONSTRAINT problem_drivers_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_follow_ups definition

-- Drop table

-- DROP TABLE public.problem_follow_ups;

CREATE TABLE public.problem_follow_ups (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	sort_order int4 NOT NULL,
	follow_up_text text NOT NULL,
	CONSTRAINT problem_follow_ups_pkey PRIMARY KEY (id),
	CONSTRAINT uq_problem_follow_ups_problem_sort_order UNIQUE (problem_id, sort_order),
	CONSTRAINT problem_follow_ups_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_hints definition

-- Drop table

-- DROP TABLE public.problem_hints;

CREATE TABLE public.problem_hints (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	hint_num int4 NOT NULL,
	hint_text text NOT NULL,
	CONSTRAINT problem_hints_pkey PRIMARY KEY (id),
	CONSTRAINT uq_problem_hints_problem_hint_num UNIQUE (problem_id, hint_num),
	CONSTRAINT problem_hints_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_solutions definition

-- Drop table

-- DROP TABLE public.problem_solutions;

CREATE TABLE public.problem_solutions (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	"content" text NOT NULL,
	CONSTRAINT problem_solutions_pkey PRIMARY KEY (id),
	CONSTRAINT problem_solutions_problem_id_key UNIQUE (problem_id),
	CONSTRAINT problem_solutions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);


-- public.problem_topics definition

-- Drop table

-- DROP TABLE public.problem_topics;

CREATE TABLE public.problem_topics (
	problem_id int4 NOT NULL,
	topic_id int4 NOT NULL,
	CONSTRAINT problem_topics_pkey PRIMARY KEY (problem_id, topic_id),
	CONSTRAINT problem_topics_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE,
	CONSTRAINT problem_topics_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.topics(id) ON DELETE CASCADE
);


-- public.submissions definition

-- Drop table

-- DROP TABLE public.submissions;

CREATE TABLE public.submissions (
	id serial4 NOT NULL,
	user_id int4 NOT NULL,
	problem_id int4 NULL,
	source_code text NOT NULL,
	"language" varchar(30) NOT NULL,
	status varchar(50) NULL,
	"stdout" text NULL,
	stderr text NULL,
	error_type varchar(50) NULL,
	execution_time_ms int4 NULL,
	memory_used_kb int4 NULL,
	judge0_token varchar(100) NULL,
	created_at timestamptz DEFAULT now() NOT NULL,
	passed_count int4 NULL,
	total_count int4 NULL,
	submission_type varchar(10) DEFAULT 'run'::character varying NOT NULL,
	CONSTRAINT submissions_pkey PRIMARY KEY (id),
	CONSTRAINT submissions_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE SET NULL,
	CONSTRAINT submissions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);


-- public.test_cases definition

-- Drop table

-- DROP TABLE public.test_cases;

CREATE TABLE public.test_cases (
	id serial4 NOT NULL,
	problem_id int4 NOT NULL,
	"stdin" text NOT NULL,
	expected_output text NOT NULL,
	is_sample bool DEFAULT true NOT NULL,
	sort_order int4 DEFAULT 0 NOT NULL,
	CONSTRAINT test_cases_pkey PRIMARY KEY (id),
	CONSTRAINT test_cases_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.problems(id) ON DELETE CASCADE
);
CREATE INDEX idx_test_cases_problem_id ON public.test_cases USING btree (problem_id);


-- public.submission_test_results definition

-- Drop table

-- DROP TABLE public.submission_test_results;

CREATE TABLE public.submission_test_results (
	id serial4 NOT NULL,
	submission_id int4 NOT NULL,
	test_case_id int4 NOT NULL,
	status varchar(50) NOT NULL,
	"stdout" text NULL,
	expected_output text NOT NULL,
	"stdin" text NOT NULL,
	execution_time_ms int4 NULL,
	memory_used_kb int4 NULL,
	judge0_token varchar(100) NULL,
	CONSTRAINT submission_test_results_pkey PRIMARY KEY (id),
	CONSTRAINT submission_test_results_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES public.submissions(id) ON DELETE CASCADE,
	CONSTRAINT submission_test_results_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE SET NULL
);
CREATE INDEX idx_str_submission_id ON public.submission_test_results USING btree (submission_id);