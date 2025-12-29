-- Telugu Portal Database Schema
-- Run this in your Supabase SQL Editor

-- Content/Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  telugu_body TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('gossip', 'sports', 'politics', 'entertainment', 'trending')),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Comments table with real-time
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_category ON posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- Enable real-time for comments
ALTER PUBLICATION supabase_realtime ADD TABLE comments;

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policies for posts
CREATE POLICY "Public read published posts" ON posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authenticated users can read all posts" ON posts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert posts" ON posts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update posts" ON posts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete posts" ON posts
  FOR DELETE TO authenticated USING (true);

-- Policies for comments
CREATE POLICY "Anyone can read comments" ON comments
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert comments" ON comments
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update updated_at
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to increment views
CREATE OR REPLACE FUNCTION increment_post_views(post_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE posts SET views = views + 1 WHERE slug = post_slug;
END;
$$ language 'plpgsql';

