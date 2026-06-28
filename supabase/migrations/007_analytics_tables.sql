CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  session_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  message_count integer DEFAULT 0,
  lead_captured boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.widget_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  session_id text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('loaded', 'opened', 'closed', 'booking_clicked', 'payment_clicked', 'message_sent')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  new_status text,
  stripe_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE CASCADE,
  session_id text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('booking_clicked', 'payment_clicked')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint to support upsert on conversations
ALTER TABLE public.conversations ADD CONSTRAINT conversations_client_session_unique UNIQUE (client_id, session_id);

-- Indexes for performance
CREATE INDEX idx_conversations_client_id ON public.conversations(client_id, started_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
CREATE INDEX idx_messages_client_id ON public.messages(client_id, created_at DESC);
CREATE INDEX idx_widget_events_client_id ON public.widget_events(client_id, created_at DESC);
CREATE INDEX idx_subscription_events_client_id ON public.subscription_events(client_id, created_at DESC);
CREATE INDEX idx_leads_client_id ON public.leads(client_id, created_at DESC);

-- RLS policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- All tables: service role only (no direct client access)
-- Data is written server-side only via API routes

CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.chatbots(client_id) ON DELETE SET NULL,
  stripe_session_id text UNIQUE NOT NULL,
  stripe_customer_id text,
  amount integer,
  currency text DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  plan text CHECK (plan IN ('basic', 'pro')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_transactions_client_id ON public.payment_transactions(client_id, created_at DESC);
CREATE INDEX idx_payment_transactions_stripe_session ON public.payment_transactions(stripe_session_id);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
