/*
  # Create roadmaps table

  1. New Tables
    - `roadmaps`
      - `id` (uuid, primary key)
      - `prompt` (text)
      - `content` (jsonb)
      - `created_at` (timestamptz)
      - `user_id` (uuid, references auth.users)

  2. Security
    - Enable RLS on `roadmaps` table
    - Add policies for authenticated users to:
      - Read their own roadmaps
      - Create new roadmaps
*/

CREATE TABLE IF NOT EXISTS roadmaps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt text NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id)
);

ALTER TABLE roadmaps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roadmaps"
  ON roadmaps
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create roadmaps"
  ON roadmaps
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS roadmaps_user_id_idx ON roadmaps(user_id);
CREATE INDEX IF NOT EXISTS roadmaps_created_at_idx ON roadmaps(created_at);