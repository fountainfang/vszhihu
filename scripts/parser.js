/**
 * VSCode Zhihu - Content Parser
 * Extracts structured data from Zhihu DOM and formats it as syntax-highlighted TS / Markdown code.
 */

window.VSZhihuParser = {
  /**
   * Detect current page type
   */
  getPageType: function() {
    const path = window.location.pathname;
    if (path.includes('/hot')) {
      return 'hot';
    }
    if (path === '/' || path.startsWith('/follow') || path.startsWith('/recommend')) {
      return 'feed';
    }
    if (path.includes('/question/')) {
      return 'question';
    }
    if (path.includes('/p/') || path.includes('/zhuanlan/')) {
      return 'article';
    }
    if (path.includes('/search')) {
      return 'search';
    }
    if (path.includes('/people/') || path.includes('/org/')) {
      return 'profile';
    }
    return 'general';
  },

  /**
   * Parse Hot Rank Page (`/hot`)
   */
  parseHotPage: function() {
    const items = document.querySelectorAll('.HotList-list section, section.HotItem, .HotItem, [aria-label*="热榜"] section, .Card .HotItem-content');
    const feedList = [];

    items.forEach((item, idx) => {
      const titleEl = item.querySelector('.HotItem-title, h2, a[href*="/question/"]');
      const title = titleEl ? titleEl.innerText.trim() : '';

      const linkEl = item.querySelector('a[href*="/question/"], a.HotItem-content, a[href*="zhihu.com"]') || titleEl;
      let href = linkEl ? linkEl.getAttribute('href') || '' : '';
      if (href.startsWith('//')) href = 'https:' + href;
      else if (href.startsWith('/')) href = 'https://www.zhihu.com' + href;

      const rankEl = item.querySelector('.HotItem-index, .HotItem-rank');
      const rank = rankEl ? rankEl.innerText.trim() : `${idx + 1}`;

      const excerptEl = item.querySelector('.HotItem-excerpt, .HotItem-content p, .HotItem-detail');
      const excerpt = excerptEl ? excerptEl.innerText.trim() : '';

      const metricsEl = item.querySelector('.HotItem-metrics, .HotItem-metricsText');
      const metrics = metricsEl ? metricsEl.innerText.trim() : '🔥 热度飙升';

      if (title) {
        feedList.push({
          id: rank || (idx + 1),
          title: title,
          href: href || 'javascript:void(0);',
          author: `Rank #${rank || (idx + 1)} · ${metrics}`,
          excerpt: excerpt || title,
          metrics: metrics
        });
      }
    });

    return {
      type: 'hot',
      title: '知乎全网热榜 (Hot Rank)',
      feedList: feedList
    };
  },

  /**
   * Parse Article Page (`/p/123456` or `/zhuanlan/`)
   */
  parseArticlePage: function() {
    const titleEl = document.querySelector('h1.Post-Title, .Post-Header h1, .ArticleItem-title, h1');
    const title = titleEl ? titleEl.innerText.trim() : document.title.replace('- 知乎', '').trim();

    const authorEl = document.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name, .Post-Header .UserLink-link, .UserLink-link');
    const authorName = authorEl ? authorEl.innerText.trim() : '知乎专栏作者';

    const badgeEl = document.querySelector('.AuthorInfo-badgeText, .AuthorInfo-detail');
    const badgeText = badgeEl ? badgeEl.innerText.trim() : '';

    const voteEl = document.querySelector('.VoteButton-count, .VoteButton--up, .Button--voteUp');
    const voteCount = voteEl ? voteEl.innerText.replace(/▲|\n|赞同/g, '').trim() || '0' : '0';

    let commentCount = '0';
    const commentBtns = Array.from(document.querySelectorAll('button, .Button'));
    const commentBtn = commentBtns.find(b => b.innerText.includes('评论'));
    if (commentBtn) {
      const match = commentBtn.innerText.match(/\d+/);
      if (match) commentCount = match[0];
    }

    const articleEl = document.querySelector('.Post-RichTextContainer, .Post-RichText, .ArticleItem-content, .RichText');
    const contentText = articleEl ? articleEl.innerText.trim() : '';
    const contentHtml = articleEl ? articleEl.innerHTML : '';

    let articleId = '';
    const pathMatch = window.location.pathname.match(/p\/(\d+)/);
    if (pathMatch) articleId = pathMatch[1];

    return {
      type: 'article',
      title: title,
      answers: [{
        id: 1,
        answerId: articleId,
        author: authorName,
        badge: badgeText,
        voteCount: voteCount,
        commentCount: commentCount,
        contentHtml: contentHtml,
        contentText: contentText,
        comments: []
      }]
    };
  },

  /**
   * Parse Question Page (`/question/123456`)
   */
  parseQuestionPage: function() {
    const titleEl = document.querySelector('h1.QuestionHeader-title, .QuestionHeader-title');
    const title = titleEl ? titleEl.innerText.trim() : document.title.replace('- 知乎', '').trim();

    const detailEl = document.querySelector('.QuestionHeader-detail .QuestionRichText, .QuestionHeader-detail');
    const detailText = detailEl ? detailEl.innerText.trim() : '';

    // Target ONLY top-level answer cards inside main column, filtering out nested parent/child containers
    const mainCol = document.querySelector('.Question-mainColumn, .Question-main') || document;
    const rawCards = Array.from(mainCol.querySelectorAll('.List-item, .AnswerCard, .AnswerItem, .ContentItem'))
                          .filter(c => !c.closest('.QuestionHeader'));
    
    const answerCards = rawCards.filter(card => {
      return !rawCards.some(other => other !== card && other.contains(card));
    });

    const answers = [];
    const seenTexts = new Set();

    answerCards.forEach((card) => {
      // Exclude question header container
      if (card.closest('.QuestionHeader')) return;

      const authorEl = card.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name, .UserLink-link, [itemprop="name"]');
      const authorName = authorEl ? (authorEl.getAttribute('content') || authorEl.innerText).trim() : '匿名用户';

      // Extract Answer ID for Zhihu Comment API with 100% precision per card
      let answerId = '';
      const html = card.outerHTML || '';
      const idMatch = html.match(/(?:answer\/|token["\:\s]+|content_id["\:\s]+|itemId["\:\s]+|name=["\']|id=["\']Answer-)(\d{10,20})/);
      if (idMatch) {
        answerId = idMatch[1];
      }

      // Fallback to URL answer ID ONLY for the very first card on single-answer pages
      if (!answerId && answers.length === 0 && window.location.pathname.includes('/answer/')) {
        const pathMatch = window.location.pathname.match(/answer\/(\d+)/);
        if (pathMatch) answerId = pathMatch[1];
      }
      
      const badgeEl = card.querySelector('.AuthorInfo-badgeText, .AuthorInfo-detail, .AuthorInfo-badge');
      const badgeText = badgeEl ? badgeEl.innerText.trim() : '';

      const avatarEl = card.querySelector('.AuthorInfo-avatar, .Avatar, img.UserLink-avatar');
      const avatarSrc = avatarEl ? avatarEl.getAttribute('src') || avatarEl.querySelector('img')?.getAttribute('src') : '';

      // Vote count extraction
      const voteEl = card.querySelector('.VoteButton-count, .VoteButton--up, .Button--voteUp, [aria-label*="赞同"]');
      let voteCount = '0';
      if (voteEl) {
        voteCount = voteEl.innerText.replace(/▲|\n|赞同/g, '').trim() || '0';
      }

      // Comment count extraction & preservation
      let commentCount = card.dataset.commentCount || '0';
      const commentBtns = Array.from(card.querySelectorAll('button, .Button, [role="button"]'));
      const commentBtn = commentBtns.find(b => b.innerText.includes('评论'));
      if (commentBtn) {
        const text = commentBtn.innerText.trim();
        const numMatch = text.match(/\d+/);
        if (numMatch) {
          commentCount = numMatch[0];
          card.dataset.commentCount = commentCount;
        }
      }

      const richTextEl = card.querySelector('.RichText, .CopyrightRichText-richText');
      const contentHtml = richTextEl ? richTextEl.innerHTML : card.innerText;
      const contentText = richTextEl ? richTextEl.innerText.trim() : '';

      // Skip duplicate answer blocks or empty text
      if (!contentText || seenTexts.has(contentText.substring(0, 100))) {
        return;
      }
      seenTexts.add(contentText.substring(0, 100));

      // Parse comment nodes (search inside card AND globally in portal/modal containers)
      let nestComments = Array.from(card.querySelectorAll('.NestComment, .CommentItemV2, .CommentItem'));
      if (nestComments.length === 0) {
        nestComments = Array.from(document.querySelectorAll('.Comments-container .NestComment, .CommentListV2 .NestComment, .Comments-container .CommentItemV2, .CommentListV2 .CommentItemV2, [class*="Comments-container"] [class*="CommentItem"], [class*="CommentList"] [class*="CommentItem"]'));
      }

      // Filter to top-level comment threads (not nested inside NestComment-children)
      const topComments = nestComments.filter(node => !node.closest('.NestComment-children') && !node.closest('[class*="replyList"]'));
      const comments = [];

      topComments.forEach((cNode, cIdx) => {
        const cAuthorEl = cNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"], .AuthorInfo-name');
        const cAuthor = cAuthorEl ? cAuthorEl.innerText.trim() : '匿名用户';
        
        const cTextEl = cNode.querySelector('.CommentItem-content, .CommentItemV2-content, .CommentItem-text, .RichText');
        const cText = cTextEl ? cTextEl.innerText.trim() : '';

        const cLikeEl = cNode.querySelector('.Button--like, .CommentItem-likeCount, [class*="like"]');
        const cLikes = cLikeEl ? cLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

        // Sub-comments (评论的评论)
        const replyNodes = cNode.querySelectorAll('.NestComment-children [class*="CommentItem"], .CommentItem-reply, .CommentItemV2-replyList [class*="CommentItemV2"], [class*="replyList"] [class*="CommentItem"]');
        const replies = [];

        replyNodes.forEach((rNode, rIdx) => {
          const rAuthorEl = rNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"]');
          const rAuthor = rAuthorEl ? rAuthorEl.innerText.trim() : '回复者';

          const rTextEl = rNode.querySelector('.CommentItem-content, .CommentItemV2-content, .RichText');
          const rText = rTextEl ? rTextEl.innerText.trim() : '';

          const rLikeEl = rNode.querySelector('.Button--like, [class*="like"]');
          const rLikes = rLikeEl ? rLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

          if (rText && rText !== cText) {
            replies.push({
              id: `${answers.length + 1}_${cIdx + 1}_sub_${rIdx + 1}`,
              author: rAuthor,
              text: rText,
              likes: rLikes
            });
          }
        });

        if (cText) {
          comments.push({
            id: `${answers.length + 1}_${cIdx + 1}`,
            author: cAuthor,
            text: cText,
            likes: cLikes,
            replies: replies
          });
        }
      });

      if (comments.length > 0 && commentCount === '0') {
        commentCount = String(comments.length);
      }

      answers.push({
        id: answers.length + 1,
        answerId: answerId,
        author: authorName || '知乎用户',
        badge: badgeText,
        avatar: avatarSrc,
        voteCount: voteCount,
        commentCount: commentCount,
        contentHtml: contentHtml,
        contentText: contentText,
        comments: comments
      });
    });

    let questionId = '';
    const qMatch = window.location.pathname.match(/question\/(\d+)/);
    if (qMatch) {
      questionId = qMatch[1];
    }

    let viewAllText = '';
    let viewAllHref = '';
    const viewAllEl = document.querySelector('.ViewAll, .QuestionMainAction, [class*="ViewAll"], .Question-mainColumn a[href*="/question/"]');
    if (viewAllEl) {
      viewAllText = viewAllEl.innerText.replace(/\s+/g, ' ').trim();
      viewAllHref = viewAllEl.getAttribute('href') || '';
    }

    if (!viewAllText && (window.location.pathname.includes('/answer/') || questionId)) {
      viewAllText = '查看全部回答';
    }
    if (!viewAllHref && questionId) {
      viewAllHref = `/question/${questionId}`;
    }

    return {
      type: 'question',
      title: title,
      detail: detailText,
      answers: answers,
      isSingleAnswer: window.location.pathname.includes('/answer/'),
      questionId: questionId,
      questionUrl: viewAllHref || (questionId ? `/question/${questionId}` : ''),
      viewAllText: viewAllText || '查看全部回答'
    };
  },

  /**
   * Parse Feed / Home Page (`/` or `/follow` or `/recommend`)
   */
  parseFeedPage: function() {
    const candidateNodes = Array.from(document.querySelectorAll(
      '.TopstoryItem, .HotItem, .Topstory-recommend .Card, .Topstory-follow .Card, .TopstoryMain .Card, [class*="TopstoryItem"], [class*="ContentItem"], .Card, section, [data-za-detail-view-path_module]'
    ));

    const links = Array.from(document.querySelectorAll('a[href*="/question/"], a[href*="/p/"], a[href*="/zhuanlan/"]'));
    links.forEach(link => {
      const card = link.closest('.Card, .TopstoryItem, [class*="Item"], section, div');
      if (card && !candidateNodes.includes(card)) {
        candidateNodes.push(card);
      }
    });

    const items = candidateNodes.filter(item => !candidateNodes.some(other => other !== item && other.contains(item)));
    const feedList = [];
    const seenUrls = new Set();

    items.forEach((item) => {
      const titleEl = item.querySelector('.ContentItem-title a, .QuestionItem-title a, h2 a, .HotItem-title, a[href*="/question/"], a[href*="/p/"], a[href*="/zhuanlan/"]');
      if (!titleEl) return;

      const title = titleEl.innerText.trim();
      let href = titleEl.getAttribute('href') || '';

      if (!title || title.length < 2) return;

      if (href.startsWith('//')) href = 'https:' + href;
      else if (href.startsWith('/')) href = 'https://www.zhihu.com' + href;

      const authorEl = item.querySelector('.UserLink-link, .AuthorInfo-name, [itemprop="name"], .AuthorInfo');
      const author = authorEl ? authorEl.innerText.replace(/\s+/g, ' ').trim() : '知乎推荐';

      const excerptEl = item.querySelector('.RichText, .ContentItem-excerpt, .HotItem-excerpt, .CopyrightRichText-richText');
      const excerpt = excerptEl ? excerptEl.innerText.trim() : '';

      const metricsEl = item.querySelector('.ContentItem-actions, .HotItem-metrics, .ContentItem-meta');
      const metrics = metricsEl ? metricsEl.innerText.replace(/\s+/g, ' ').trim() : '';

      if (!href || seenUrls.has(href)) {
        return;
      }
      seenUrls.add(href);

      feedList.push({
        id: feedList.length + 1,
        title: title,
        href: href,
        author: author,
        excerpt: excerpt || title,
        metrics: metrics
      });
    });

    return {
      type: 'feed',
      title: document.title.replace('- 知乎', '').trim() || '知乎推荐 Feed',
      feedList: feedList
    };
  },

  /**
   * Format parsed question data into TypeScript source code format
   */
  formatAsTypeScript: function(data) {
    if (data.type === 'feed' || data.type === 'hot') {
      let code = `<span class="syn-kw">import</span> { <span class="syn-type">FeedItem</span>, <span class="syn-type">ZhihuStream</span> } <span class="syn-kw">from</span> <span class="syn-str">'@zhihu/feed'</span>;\n\n`;
      code += `<span class="syn-cmt">/**\n * Zhihu Stream - ${escapeHtml(data.title)}\n * Generated at ${new Date().toLocaleTimeString()}\n */</span>\n`;
      code += `<span class="syn-kw">export const</span> <span class="syn-var">${data.type === 'hot' ? 'hotRankStream' : 'feedStream'}</span>: <span class="syn-type">ZhihuStream</span> = [\n`;

      data.feedList.forEach((item) => {
        code += `  {\n`;
        code += `    <span class="syn-var">id</span>: <span class="syn-num">${item.id}</span>,\n`;
        code += `    <span class="syn-var">title</span>: <a href="${item.href}" class="vsc-code-link"><span class="syn-str">"${escapeHtml(item.title).replace(/"/g, '\\"')}"</span></a>,\n`;
        code += `    <span class="syn-var">author</span>: <span class="syn-str">"${escapeHtml(item.author)}"</span>,\n`;
        code += `    <span class="syn-var">url</span>: <a href="${item.href}" class="vsc-code-link"><span class="syn-str">"${escapeHtml(item.href)}"</span></a>,\n`;
        code += `    <span class="syn-var">excerpt</span>: <span class="syn-str">"${escapeHtml(item.excerpt.substring(0, 120).replace(/"/g, '\\"'))}..."</span>\n`;
        code += `  },\n`;
      });

      code += `];\n`;
      return code;
    }

    // Question format
    let code = `<span class="syn-kw">import</span> { <span class="syn-type">Question</span>, <span class="syn-type">Answer</span>, <span class="syn-type">User</span> } <span class="syn-kw">from</span> <span class="syn-str">'@zhihu/core'</span>;\n\n`;
    code += `<span class="syn-cmt">/**\n * QUESTION: ${escapeHtml(data.title)}\n`;
    if (data.detail) {
      code += ` * ${escapeHtml(data.detail).split('\n').join('\n * ')}\n`;
    }
    code += ` */</span>\n\n`;

    code += `<span class="syn-kw">export interface</span> <span class="syn-type">TargetQuestion</span> <span class="syn-kw">extends</span> <span class="syn-type">Question</span> {\n`;
    code += `  <span class="syn-var">title</span>: <span class="syn-str">"${escapeHtml(data.title).replace(/"/g, '\\"')}"</span>;\n`;
    code += `  <span class="syn-var">totalAnswers</span>: <span class="syn-num">${data.answers.length}</span>;\n`;
    code += `}\n\n`;

    data.answers.forEach((ans, idx) => {
      code += `<span class="vsc-answer-card" id="ans-${ans.id}">\n`;
      code += `<span class="syn-cmt">/**\n`;
      code += ` * ANSWER #${idx + 1} by @${escapeHtml(ans.author)} ${ans.badge ? '(' + escapeHtml(ans.badge) + ')' : ''}\n`;
      code += ` * Votes: ▲ ${ans.voteCount} | Comments: 💬 ${ans.commentCount}\n`;
      code += ` */</span>\n`;
      code += `<span class="syn-kw">export const</span> <span class="syn-var">answer_${ans.id}</span>: <span class="syn-type">Answer</span> = {\n`;
      code += `  <span class="syn-var">author</span>: <span class="syn-str">"${escapeHtml(ans.author)}"</span>,\n`;
      code += `  <span class="syn-var">voteCount</span>: <span class="syn-num">${ans.voteCount.replace(/,/g, '')}</span>,\n`;
      code += `  <span class="syn-var">getContent</span>: <span class="syn-kw">function</span>(): <span class="syn-type">string</span> {\n`;
      code += `    <span class="syn-ctrl">return</span> \`\n`;

      // Content paragraph formatting
      const lines = ans.contentText.split('\n');
      lines.forEach(line => {
        if (line.trim()) {
          code += `      ${escapeHtml(line)}\n`;
        }
      });

      code += `    \`;\n`;
      code += `  },\n`;

      // Render Comments and Sub-comments
      if (ans.comments && ans.comments.length > 0) {
        code += `  <span class="syn-var">comments</span>: [\n`;
        ans.comments.forEach(cmt => {
          code += `    {\n`;
          code += `      <span class="syn-var">id</span>: <span class="syn-str">"${cmt.id}"</span>,\n`;
          code += `      <span class="syn-var">author</span>: <span class="syn-str">"${escapeHtml(cmt.author)}"</span>,\n`;
          code += `      <span class="syn-var">content</span>: <span class="syn-str">"${escapeHtml(cmt.text).replace(/"/g, '\\"')}"</span>,\n`;
          code += `      <span class="syn-var">likes</span>: <span class="syn-num">${cmt.likes}</span>,\n`;

          if (cmt.replies && cmt.replies.length > 0) {
            code += `      <span class="syn-var">nestedReplies</span>: [\n`;
            cmt.replies.forEach(r => {
              code += `        {\n`;
              code += `          <span class="syn-var">replyAuthor</span>: <span class="syn-str">"${escapeHtml(r.author)}"</span>,\n`;
              code += `          <span class="syn-var">replyText</span>: <span class="syn-str">"${escapeHtml(r.text).replace(/"/g, '\\"')}"</span>\n`;
              code += `        },\n`;
            });
            code += `      ]\n`;
          }

          code += `    },\n`;
        });
        code += `  ]\n`;
      } else {
        code += `  <span class="syn-cmt vsc-code-comment-link" data-answer-idx="${idx}" data-answer-id="${ans.answerId}">// Click here or click button below to load & expand live comments (💬 ${ans.commentCount})</span>\n`;
      }

      code += `};\n`;
      code += `<div class="vsc-action-bar">\n`;
      code += `  <button class="vsc-btn-action">▲ 赞同 ${ans.voteCount}</button>\n`;
      code += `  <button class="vsc-btn-action vsc-btn-comment-trigger" data-answer-idx="${idx}" data-answer-id="${ans.answerId}">💬 ${ans.commentCount} 评论/回复区</button>\n`;
      if (data.isSingleAnswer && data.questionUrl) {
        code += `  <a href="${data.questionUrl}" class="vsc-btn-action vsc-btn-view-all" data-question-url="${data.questionUrl}">📖 ${escapeHtml(data.viewAllText || '查看全部回答')}</a>\n`;
      }
      code += `</div>\n`;
      code += `</span>\n\n`;
    });

    return code;
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
