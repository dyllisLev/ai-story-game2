--
-- PostgreSQL database dump
--

\restrict 0bxTfp6jKncXnvgWPgNch9UYUj4J95zdvIrnVkiaeMkAGXdf8qBBwgDoM8srAuv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.7 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: get_story_salt(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_story_salt(p_story_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT split_part(password_hash, ':', 1)
    FROM stories
    WHERE id = p_story_id AND password_hash IS NOT NULL;
  $$;


--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: verify_story_password(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_story_password(p_story_id uuid, p_input_hash text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
    SELECT EXISTS(
      SELECT 1 FROM stories
      WHERE id = p_story_id AND password_hash = p_input_hash
    );
  $$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    endpoint text NOT NULL,
    request_model text,
    request_system_prompt text,
    request_messages jsonb,
    request_body jsonb,
    response_text text,
    response_usage jsonb,
    response_error text,
    duration_ms integer,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.config (
    id text NOT NULL,
    password_hash text,
    created_at timestamp with time zone DEFAULT now(),
    value jsonb,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: presets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.presets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    is_default boolean DEFAULT false,
    world_setting text DEFAULT ''::text,
    story text DEFAULT ''::text,
    characters text DEFAULT ''::text,
    character_name text DEFAULT ''::text,
    character_setting text DEFAULT ''::text,
    user_note text DEFAULT ''::text,
    system_rules text DEFAULT ''::text,
    use_latex boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: session_memory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session_memory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    type text NOT NULL,
    content jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT session_memory_type_check CHECK ((type = ANY (ARRAY['short_term'::text, 'characters'::text, 'goals'::text, 'long_term'::text])))
);


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid NOT NULL,
    story_id uuid,
    title text NOT NULL,
    preset jsonb DEFAULT '{}'::jsonb,
    messages jsonb DEFAULT '[]'::jsonb,
    model text,
    summary text DEFAULT ''::text,
    summary_up_to_index integer DEFAULT 0,
    owner_uid uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_played_at timestamp with time zone DEFAULT now()
);


--
-- Name: stories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stories (
    id uuid NOT NULL,
    title text NOT NULL,
    world_setting text DEFAULT ''::text,
    story text DEFAULT ''::text,
    character_name text DEFAULT ''::text,
    character_setting text DEFAULT ''::text,
    characters text DEFAULT ''::text,
    user_note text DEFAULT ''::text,
    system_rules text DEFAULT ''::text,
    use_latex boolean DEFAULT false,
    is_public boolean DEFAULT false,
    password_hash text,
    owner_uid uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: stories_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.stories_safe WITH (security_invoker='false') AS
 SELECT id,
    title,
    world_setting,
    story,
    character_name,
    character_setting,
    characters,
    user_note,
    system_rules,
    use_latex,
    is_public,
    (password_hash IS NOT NULL) AS has_password,
    owner_uid,
    created_at,
    updated_at
   FROM public.stories
  WHERE (is_public = true);


--
-- Name: api_logs api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_pkey PRIMARY KEY (id);


--
-- Name: config config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.config
    ADD CONSTRAINT config_pkey PRIMARY KEY (id);


--
-- Name: presets presets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.presets
    ADD CONSTRAINT presets_pkey PRIMARY KEY (id);


--
-- Name: session_memory session_memory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_memory
    ADD CONSTRAINT session_memory_pkey PRIMARY KEY (id);


--
-- Name: session_memory session_memory_session_id_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_memory
    ADD CONSTRAINT session_memory_session_id_type_key UNIQUE (session_id, type);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: stories stories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stories
    ADD CONSTRAINT stories_pkey PRIMARY KEY (id);


--
-- Name: idx_api_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_created ON public.api_logs USING btree (created_at DESC);


--
-- Name: idx_api_logs_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_api_logs_session ON public.api_logs USING btree (session_id);


--
-- Name: idx_presets_is_default; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_presets_is_default ON public.presets USING btree (is_default) WHERE (is_default = true);


--
-- Name: idx_sessions_last_played; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_last_played ON public.sessions USING btree (last_played_at DESC);


--
-- Name: idx_sessions_story_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_story_id ON public.sessions USING btree (story_id);


--
-- Name: idx_stories_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_created_at ON public.stories USING btree (created_at DESC);


--
-- Name: idx_stories_is_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stories_is_public ON public.stories USING btree (is_public) WHERE (is_public = true);


--
-- Name: config config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER config_updated_at BEFORE UPDATE ON public.config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: presets presets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER presets_updated_at BEFORE UPDATE ON public.presets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: sessions sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sessions_updated_at BEFORE UPDATE ON public.sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: stories stories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER stories_updated_at BEFORE UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: session_memory update_session_memory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_session_memory_updated_at BEFORE UPDATE ON public.session_memory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: api_logs api_logs_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_logs
    ADD CONSTRAINT api_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE SET NULL;


--
-- Name: session_memory session_memory_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session_memory
    ADD CONSTRAINT session_memory_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_story_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_story_id_fkey FOREIGN KEY (story_id) REFERENCES public.stories(id) ON DELETE SET NULL;


--
-- Name: api_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.api_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

--
-- Name: config config_select_safe; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_select_safe ON public.config FOR SELECT USING (((auth.uid() IS NOT NULL) AND (id <> 'admin'::text)));


--
-- Name: config config_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY config_update_admin ON public.config FOR UPDATE USING (((auth.uid())::text = ( SELECT (config_1.value ->> 0)
   FROM public.config config_1
  WHERE (config_1.id = 'admin_uid'::text))));


--
-- Name: presets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.presets ENABLE ROW LEVEL SECURITY;

--
-- Name: presets presets_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presets_delete_admin ON public.presets FOR DELETE USING (((auth.uid() IS NOT NULL) AND ((auth.uid())::text = ( SELECT (config.value ->> 0)
   FROM public.config
  WHERE (config.id = 'admin_uid'::text)
 LIMIT 1))));


--
-- Name: presets presets_insert_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presets_insert_admin ON public.presets FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND ((auth.uid())::text = ( SELECT (config.value ->> 0)
   FROM public.config
  WHERE (config.id = 'admin_uid'::text)
 LIMIT 1))));


--
-- Name: presets presets_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presets_select_public ON public.presets FOR SELECT USING (true);


--
-- Name: presets presets_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY presets_update_admin ON public.presets FOR UPDATE USING (((auth.uid() IS NOT NULL) AND ((auth.uid())::text = ( SELECT (config.value ->> 0)
   FROM public.config
  WHERE (config.id = 'admin_uid'::text)
 LIMIT 1))));


--
-- Name: session_memory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.session_memory ENABLE ROW LEVEL SECURITY;

--
-- Name: session_memory session_memory_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_memory_delete ON public.session_memory FOR DELETE USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.owner_uid = auth.uid()))));


--
-- Name: session_memory session_memory_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_memory_insert ON public.session_memory FOR INSERT WITH CHECK ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.owner_uid = auth.uid()))));


--
-- Name: session_memory session_memory_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_memory_select ON public.session_memory FOR SELECT USING (true);


--
-- Name: session_memory session_memory_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY session_memory_update ON public.session_memory FOR UPDATE USING ((session_id IN ( SELECT sessions.id
   FROM public.sessions
  WHERE (sessions.owner_uid = auth.uid()))));


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions sessions_insert_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_insert_anon ON public.sessions FOR INSERT WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: sessions sessions_select_public; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_select_public ON public.sessions FOR SELECT USING (true);


--
-- Name: sessions sessions_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sessions_update_owner ON public.sessions FOR UPDATE USING ((auth.uid() = owner_uid));


--
-- Name: stories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

--
-- Name: stories stories_delete_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_delete_owner ON public.stories FOR DELETE USING ((auth.uid() = owner_uid));


--
-- Name: stories stories_insert_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_insert_owner ON public.stories FOR INSERT WITH CHECK (((auth.uid() IS NOT NULL) AND (owner_uid = auth.uid())));


--
-- Name: stories stories_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_select ON public.stories FOR SELECT USING (((is_public = true) OR (auth.uid() = owner_uid)));


--
-- Name: stories stories_update_owner; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY stories_update_owner ON public.stories FOR UPDATE USING ((auth.uid() = owner_uid));


--
-- PostgreSQL database dump complete
--

\unrestrict 0bxTfp6jKncXnvgWPgNch9UYUj4J95zdvIrnVkiaeMkAGXdf8qBBwgDoM8srAuv

