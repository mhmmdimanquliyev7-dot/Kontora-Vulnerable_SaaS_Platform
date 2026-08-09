-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "website" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_search_logs" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_search_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blog_comments_postId_createdAt_idx" ON "blog_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "blog_search_logs_createdAt_idx" ON "blog_search_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
