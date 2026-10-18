-- Add 'active' column to schools table
ALTER TABLE schools ADD COLUMN active BOOLEAN DEFAULT true;
