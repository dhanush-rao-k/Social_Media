-- Interactive features: counts and triggers
USE SOCIAL_MEDIA;

-- Add counters to Posts if not present
ALTER TABLE Posts ADD COLUMN IF NOT EXISTS LikeCount INT DEFAULT 0;
ALTER TABLE Posts ADD COLUMN IF NOT EXISTS CommentCount INT DEFAULT 0;

-- Backfill counts from existing data
UPDATE Posts p
LEFT JOIN (
  SELECT PostID, COUNT(*) AS c FROM Likes GROUP BY PostID
) l ON l.PostID = p.PostID
SET p.LikeCount = COALESCE(l.c,0);

UPDATE Posts p
LEFT JOIN (
  SELECT PostID, COUNT(*) AS c FROM Comments GROUP BY PostID
) c ON c.PostID = p.PostID
SET p.CommentCount = COALESCE(c.c,0);

DELIMITER //
-- Likes triggers
DROP TRIGGER IF EXISTS AfterLikeInsert//
CREATE TRIGGER AfterLikeInsert
AFTER INSERT ON Likes
FOR EACH ROW
BEGIN
  UPDATE Posts SET LikeCount = LikeCount + 1 WHERE PostID = NEW.PostID;
END//

DROP TRIGGER IF EXISTS AfterLikeDelete//
CREATE TRIGGER AfterLikeDelete
AFTER DELETE ON Likes
FOR EACH ROW
BEGIN
  UPDATE Posts SET LikeCount = GREATEST(0, LikeCount - 1) WHERE PostID = OLD.PostID;
END//

-- Comments triggers
DROP TRIGGER IF EXISTS AfterCommentInsertCount//
CREATE TRIGGER AfterCommentInsertCount
AFTER INSERT ON Comments
FOR EACH ROW
BEGIN
  UPDATE Posts SET CommentCount = CommentCount + 1 WHERE PostID = NEW.PostID;
END//

DROP TRIGGER IF EXISTS AfterCommentDeleteCount//
CREATE TRIGGER AfterCommentDeleteCount
AFTER DELETE ON Comments
FOR EACH ROW
BEGIN
  UPDATE Posts SET CommentCount = GREATEST(0, CommentCount - 1) WHERE PostID = OLD.PostID;
END//
DELIMITER ;
