/**
 * VSCode Zhihu - Content Parser
 * Extracts structured data from Zhihu DOM and formats it as syntax-highlighted TS / Markdown code.
 */

window.VSZhihuParser = {
  /**
   * Detect current page type
   */
  getPageType: function(doc = (typeof document !== 'undefined' ? document : null), url = (typeof window !== 'undefined' ? window.location.href : '')) {
    let path = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    try {
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        path = new URL(url).pathname;
      }
    } catch(e) {}

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
  parseHotPage: function(doc = (typeof document !== 'undefined' ? document : null)) {
    const targetDoc = doc || document;
    const items = targetDoc.querySelectorAll('.HotList-list section, section.HotItem, .HotItem, [aria-label*="热榜"] section, .Card .HotItem-content');
    const feedList = [];

    if (items.length === 0) {
      const initialDataEl = targetDoc.getElementById('js-initialData');
      if (initialDataEl && initialDataEl.textContent) {
        try {
          const json = JSON.parse(initialDataEl.textContent);
          const hotList = json?.initialState?.topstory?.hotList || json?.initialState?.entities?.hotList;
          if (Array.isArray(hotList)) {
            hotList.forEach((item, idx) => {
              const target = item.target || item;
              const title = target.titleArea?.text || target.title || '';
              let href = target.link?.url || target.url || '';
              if (href.startsWith('//')) href = 'https:' + href;
              else if (href.startsWith('/')) href = 'https://www.zhihu.com' + href;

              const excerpt = target.excerptArea?.text || target.excerpt || '';
              const metrics = target.metricsArea?.text || '🔥 热度飙升';

              if (title) {
                feedList.push({
                  id: idx + 1,
                  title: title,
                  href: href || 'javascript:void(0);',
                  author: `Rank #${idx + 1} · ${metrics}`,
                  excerpt: excerpt || title,
                  metrics: metrics
                });
              }
            });
          }
        } catch(e) {}
      }
    }

    if (feedList.length === 0) {
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
    }

    return {
      type: 'hot',
      title: '知乎全网热榜 (Hot Rank)',
      feedList: feedList
    };
  },

  extractCommentsFromInitialData: function(doc = (typeof document !== 'undefined' ? document : null)) {
    try {
      const targetDoc = doc || document;
      const el = targetDoc.getElementById('js-initialData');
      let data = null;
      if (el && el.textContent) {
        data = JSON.parse(el.textContent);
      } else if (typeof window !== 'undefined' && window.__INITIAL_STATE__) {
        data = window.__INITIAL_STATE__;
      }

      if (!data) return [];

      const initialState = data.initialState || data;
      const entities = initialState.entities || {};
      const commentsMap = entities.comments || {};

      const commentsList = Object.values(commentsMap);
      if (commentsList.length === 0) return [];

      const rootComments = commentsList.filter(c => !c.replyToCommentId && !c.reply_to_comment_id && !c.parentId && !c.replyToAnswerId);

      const parsedComments = rootComments.map(c => {
        const authorName = c.author?.member?.name || c.author?.name || '知乎用户';
        const content = (c.content || '').replace(/<[^>]+>/g, '').trim();
        const likes = c.voteCount || c.vote_count || c.likes || 0;
        const createdTime = c.createdTime || c.created_time || 0;
        const childCount = c.childCommentCount || c.child_comment_count || 0;

        const replies = [];
        if (c.childComments && Array.isArray(c.childComments)) {
          c.childComments.forEach(child => {
            const childObj = typeof child === 'object' ? child : commentsMap[child];
            if (childObj) {
              const rAuthor = childObj.author?.member?.name || childObj.author?.name || '回复者';
              const rText = (childObj.content || '').replace(/<[^>]+>/g, '').trim();
              const rLikes = childObj.voteCount || childObj.vote_count || 0;
              if (rText) {
                replies.push({ author: rAuthor, text: rText, likes: rLikes });
              }
            }
          });
        }

        return {
          id: c.id,
          author: authorName,
          text: content,
          likes: likes,
          time: createdTime ? new Date(createdTime * 1000).toLocaleString() : '',
          childCount: childCount,
          replies: replies
        };
      });

      return parsedComments;
    } catch(e) {
      console.warn('[VSCode-Zhihu] Error parsing initialData comments:', e);
      return [];
    }
  },

  /**
   * Parse Article Page (`/p/123456` or `/zhuanlan/`)
   */
  parseArticlePage: function(doc = (typeof document !== 'undefined' ? document : null), url = '') {
    const targetDoc = doc || document;
    const titleEl = targetDoc.querySelector('h1.Post-Title, .Post-Header h1, .ArticleItem-title, h1');
    let title = titleEl ? titleEl.innerText.trim() : (targetDoc.title ? targetDoc.title.replace('- 知乎', '').trim() : '知乎文章');

    const authorEl = targetDoc.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name, .Post-Header .UserLink-link, .UserLink-link');
    let authorName = authorEl ? authorEl.innerText.trim() : '知乎专栏作者';

    const badgeEl = targetDoc.querySelector('.AuthorInfo-badgeText, .AuthorInfo-detail');
    let badgeText = badgeEl ? badgeEl.innerText.trim() : '';

    const voteEl = targetDoc.querySelector('.VoteButton-count, .VoteButton--up, .Button--voteUp');
    let voteCount = voteEl ? voteEl.innerText.replace(/▲|\n|赞同/g, '').trim() || '0' : '0';

    let commentCount = '0';
    const commentBtns = Array.from(targetDoc.querySelectorAll('button, .Button'));
    const commentBtn = commentBtns.find(b => (b.innerText || b.textContent || '').includes('评论'));
    if (commentBtn) {
      const match = (commentBtn.innerText || commentBtn.textContent).match(/\d+/);
      if (match) commentCount = match[0];
    }

    const articleEl = targetDoc.querySelector('.Post-RichTextContainer, .Post-RichText, .ArticleItem-content, .RichText');
    let contentText = articleEl ? this.cleanContentText(articleEl) : '';
    let contentHtml = articleEl ? articleEl.innerHTML : '';

    let articleId = '';
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const pathMatch = currentUrl.match(/p\/(\d+)/);
    if (pathMatch) articleId = pathMatch[1];

    if (!contentText) {
      const initialDataEl = targetDoc.getElementById('js-initialData');
      if (initialDataEl && initialDataEl.textContent) {
        try {
          const json = JSON.parse(initialDataEl.textContent);
          const articles = json?.initialState?.entities?.articles || {};
          const artObj = Object.values(articles)[0] || (articleId ? articles[articleId] : null);
          if (artObj) {
            title = artObj.title || title;
            authorName = artObj.author?.name || authorName;
            contentText = (artObj.content || '').replace(/<[^>]+>/g, '').trim();
            voteCount = String(artObj.voteupCount || voteCount);
            commentCount = String(artObj.commentCount || commentCount);
          }
        } catch(e) {}
      }
    }

    let comments = this.extractCommentsFromInitialData(targetDoc);

    if (comments.length === 0) {
      const commentNodes = Array.from(targetDoc.querySelectorAll('.NestComment, .CommentItemV2, .CommentItem, [class*="CommentItem"], [class*="NestComment"]'));
      const topComments = commentNodes.filter(node => !node.parentElement || !node.parentElement.closest('.NestComment, .CommentItemV2, .CommentItem, [class*="NestComment"], [class*="CommentItem"], [class*="replyList"]'));

      topComments.forEach((cNode, cIdx) => {
        const cAuthorEl = cNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"], .AuthorInfo-name, [class*="UserLink"]');
        const cAuthor = cAuthorEl ? cAuthorEl.innerText.trim() : '知乎用户';
        
        const cTextEl = cNode.querySelector('.CommentItem-content, .CommentItemV2-content, .CommentItem-text, .RichText, [class*="content"]');
        const cText = cTextEl ? cTextEl.innerText.trim() : '';

        const cLikeEl = cNode.querySelector('.Button--like, .CommentItem-likeCount, [class*="like"]');
        const cLikes = cLikeEl ? cLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

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
            replies.push({ id: `1_${cIdx + 1}_sub_${rIdx + 1}`, author: rAuthor, text: rText, likes: rLikes });
          }
        });

        if (cText) {
          comments.push({ id: `1_${cIdx + 1}`, author: cAuthor, text: cText, likes: cLikes, replies: replies });
        }
      });
    }

    if (comments.length > 0 && commentCount === '0') {
      commentCount = String(comments.length);
    }

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
        contentText: contentText || title,
        comments: comments
      }]
    };
  },

  /**
   * Extract Answer ID from card element with multi-strategy fallback
   */
  extractAnswerId: function(card) {
    if (!card) return '';

    // 1. Direct name attribute (Zhihu's native AnswerItem container: <div name="12345">)
    const nameAttr = card.getAttribute('name');
    if (nameAttr && /^\d{8,20}$/.test(nameAttr)) return nameAttr;

    // 2. Data attributes
    const dataId = card.dataset?.id || card.dataset?.entryId || card.dataset?.zdContentId || card.dataset?.zopRet;
    if (dataId && /^\d{8,20}$/.test(dataId)) return dataId;

    // 3. Search links or meta inside card for /answer/ID
    const links = Array.from(card.querySelectorAll('a[href*="/answer/"], meta[content*="/answer/"], a[href*="/question/"]'));
    for (const link of links) {
      const val = link.getAttribute('href') || link.getAttribute('content') || '';
      const match = val.match(/answer\/(\d{8,20})/);
      if (match) return match[1];
    }

    // 4. Regex match on card outerHTML for name=..., answer/..., content_id=...
    const html = card.outerHTML || '';
    const match = html.match(/(?:answer\/|Answer-|content_id["\:\s=]+|token["\:\s=]+|itemId["\:\s=]+|name=["\']?|data-id=["\']?)(\d{8,20})/i);
    if (match) return match[1];

    // 5. Fallback to URL answer ID for answer pages
    if (window.location.pathname.includes('/answer/')) {
      const pathMatch = window.location.pathname.match(/answer\/(\d{8,20})/);
      if (pathMatch) return pathMatch[1];
    }

    return '';
  },

  cleanContentText: function(target) {
    if (!target) return '';
    
    if (typeof target === 'string') {
      return target
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\.css-[^{]+\{[^}]+\}/g, '')
        .replace(/\{[^{}]*dynamic-range-limit[^{}]*\}/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
    }

    try {
      const clone = target.cloneNode(true);
      clone.querySelectorAll('style, script, svg, [data-uncomfortable], link, meta').forEach(node => node.remove());
      
      let text = (clone.innerText || clone.textContent || '').trim();
      text = text
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/\.css-[^{]+\{[^}]+\}/g, '')
        .replace(/\{[^{}]*dynamic-range-limit[^{}]*\}/gi, '')
        .replace(/\n\s*\n/g, '\n')
        .trim();
      return text;
    } catch(e) {
      return (target.innerText || target.textContent || '').trim();
    }
  },

  cleanAuthorName: function(name) {
    if (!name) return '知乎用户';
    let clean = String(name)
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/\.css-[^{]+\{[^}]+\}/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return clean || '知乎用户';
  },

  /**
   * Parse Question Page (`/question/123456`)
   */
  parseQuestionPage: function(doc = (typeof document !== 'undefined' ? document : null), url = '') {
    const targetDoc = doc || document;
    const titleEl = targetDoc.querySelector('h1.QuestionHeader-title, .QuestionHeader-title, h1');
    let title = titleEl ? (titleEl.innerText || titleEl.textContent || '').trim() : (targetDoc.title ? targetDoc.title.replace('- 知乎', '').trim() : '知乎问题');

    const detailEl = targetDoc.querySelector('.QuestionHeader-detail .QuestionRichText, .QuestionHeader-detail');
    let detailText = detailEl ? this.cleanContentText(detailEl) : '';

    const mainCol = targetDoc.querySelector('.Question-mainColumn, .Question-main, .QuestionAnswers-answers, .List') || targetDoc;
    const rawCards = Array.from(mainCol.querySelectorAll('.List-item, .AnswerCard, .AnswerItem, .ContentItem, [class*="AnswerItem"], [class*="ContentItem"]'))
                          .filter(c => !c.closest('.QuestionHeader'));
    
    const answerCards = rawCards.filter(card => {
      return !rawCards.some(other => other !== card && other.contains(card));
    });

    const answers = [];
    const seenTexts = new Set();

    answerCards.forEach((card) => {
      if (card.closest('.QuestionHeader')) return;

      const authorEl = card.querySelector('.AuthorInfo-name .UserLink-link, .AuthorInfo-name, .UserLink-link, [itemprop="name"]');
      const rawAuthor = authorEl ? (authorEl.getAttribute('content') || authorEl.innerText || authorEl.textContent || '') : '';
      const authorName = this.cleanAuthorName(rawAuthor);

      const answerId = this.extractAnswerId(card);
      
      const badgeEl = card.querySelector('.AuthorInfo-badgeText, .AuthorInfo-detail, .AuthorInfo-badge');
      const badgeText = badgeEl ? badgeEl.innerText.trim() : '';

      const avatarEl = card.querySelector('.AuthorInfo-avatar, .Avatar, img.UserLink-avatar');
      const avatarSrc = avatarEl ? avatarEl.getAttribute('src') || avatarEl.querySelector('img')?.getAttribute('src') : '';

      const voteEl = card.querySelector('.VoteButton-count, .VoteButton--up, .Button--voteUp, [aria-label*="赞同"]');
      let voteCount = '0';
      if (voteEl) {
        voteCount = voteEl.innerText.replace(/▲|\n|赞同/g, '').trim() || '0';
      }

      let commentCount = card.dataset.commentCount || '0';
      const commentBtns = Array.from(card.querySelectorAll('button, .Button, [role="button"]'));
      const commentBtn = commentBtns.find(b => (b.innerText || b.textContent || '').includes('评论'));
      if (commentBtn) {
        const text = (commentBtn.innerText || commentBtn.textContent).trim();
        const numMatch = text.match(/\d+/);
        if (numMatch) {
          commentCount = numMatch[0];
          card.dataset.commentCount = commentCount;
        }
      }

      const richTextEl = card.querySelector('.RichText, .CopyrightRichText-richText');
      const contentHtml = richTextEl ? richTextEl.innerHTML : card.innerText;
      const contentText = richTextEl ? this.cleanContentText(richTextEl) : this.cleanContentText(card);

      if (!contentText || seenTexts.has(contentText.substring(0, 100))) {
        return;
      }
      seenTexts.add(contentText.substring(0, 100));

      let nestComments = Array.from(card.querySelectorAll('.NestComment, .CommentItemV2, .CommentItem'));
      if (nestComments.length === 0) {
        nestComments = Array.from(targetDoc.querySelectorAll('.Comments-container .NestComment, .CommentListV2 .NestComment, .Comments-container .CommentItemV2, .CommentListV2 .CommentItemV2, [class*="Comments-container"] [class*="CommentItem"], [class*="CommentList"] [class*="CommentItem"]'));
      }

      const topComments = nestComments.filter(node => !node.closest('.NestComment-children') && !node.closest('[class*="replyList"]'));
      const comments = [];

      topComments.forEach((cNode, cIdx) => {
        const cAuthorEl = cNode.querySelector('.UserLink-link, .CommentItem-author, .CommentItemV2-author, a[href*="/people/"], .AuthorInfo-name');
        const cAuthor = cAuthorEl ? cAuthorEl.innerText.trim() : '匿名用户';
        
        const cTextEl = cNode.querySelector('.CommentItem-content, .CommentItemV2-content, .CommentItem-text, .RichText');
        const cText = cTextEl ? cTextEl.innerText.trim() : '';

        const cLikeEl = cNode.querySelector('.Button--like, .CommentItem-likeCount, [class*="like"]');
        const cLikes = cLikeEl ? cLikeEl.innerText.replace(/[^\d]/g, '').trim() || '0' : '0';

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

    // Fallback parsing from js-initialData if no answers found
    if (answers.length === 0) {
      const initialDataEl = targetDoc.getElementById('js-initialData');
      if (initialDataEl && initialDataEl.textContent) {
        try {
          const json = JSON.parse(initialDataEl.textContent);
          const state = json?.initialState || json;
          const questionsMap = state?.entities?.questions || {};
          const qObj = Object.values(questionsMap)[0];
          if (qObj && qObj.title) {
            title = qObj.title;
            detailText = qObj.detail || detailText;
          }

          const answersMap = state?.entities?.answers || {};
          const ansList = Object.values(answersMap);
          ansList.forEach((ansObj, idx) => {
            const author = ansObj.author?.name || '知乎用户';
            const rawContent = ansObj.content || ansObj.excerpt || '';
            const cText = rawContent.replace(/<[^>]+>/g, '').trim();
            if (cText) {
              answers.push({
                id: idx + 1,
                answerId: String(ansObj.id || idx + 1),
                author: author,
                badge: ansObj.author?.headline || '',
                voteCount: String(ansObj.voteupCount || 0),
                commentCount: String(ansObj.commentCount || 0),
                contentText: cText,
                comments: []
              });
            }
          });
        } catch(e) {}
      }
    }

    let questionId = '';
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const qMatch = currentUrl.match(/question\/(\d+)/);
    if (qMatch) {
      questionId = qMatch[1];
    }

    let viewAllText = '';
    let viewAllHref = '';
    const viewAllEl = targetDoc.querySelector('.ViewAll, .QuestionMainAction, [class*="ViewAll"], .Question-mainColumn a[href*="/question/"]');
    if (viewAllEl) {
      viewAllText = viewAllEl.innerText.replace(/\s+/g, ' ').trim();
      viewAllHref = viewAllEl.getAttribute('href') || '';
    }

    if (!viewAllText && (currentUrl.includes('/answer/') || questionId)) {
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
      isSingleAnswer: currentUrl.includes('/answer/'),
      questionId: questionId,
      questionUrl: viewAllHref || (questionId ? `/question/${questionId}` : ''),
      viewAllText: viewAllText || '查看全部回答'
    };
  },

  /**
   * Parse Feed / Home Page (`/` or `/follow` or `/recommend`)
   */
  parseFeedPage: function(doc = (typeof document !== 'undefined' ? document : null)) {
    const targetDoc = doc || document;
    const feedList = [];
    const seenUrls = new Set();

    // 1. DOM extraction with textContent fallback
    const candidateNodes = Array.from(targetDoc.querySelectorAll(
      '.TopstoryItem, .HotItem, .Topstory-recommend .Card, .Topstory-follow .Card, .TopstoryMain .Card, [class*="TopstoryItem"], [class*="ContentItem"], .Card, section, [data-za-detail-view-path_module]'
    ));

    const links = Array.from(targetDoc.querySelectorAll('a[href*="/question/"], a[href*="/p/"], a[href*="/zhuanlan/"]'));
    links.forEach(link => {
      const card = link.closest('.Card, .TopstoryItem, [class*="Item"], section, div');
      if (card && !candidateNodes.includes(card)) {
        candidateNodes.push(card);
      }
    });

    const items = candidateNodes.filter(item => !candidateNodes.some(other => other !== item && other.contains(item)));

    items.forEach((item) => {
      const titleEl = item.querySelector('.ContentItem-title a, .QuestionItem-title a, h2 a, .HotItem-title, a[href*="/question/"], a[href*="/p/"], a[href*="/zhuanlan/"]');
      if (!titleEl) return;

      const title = (titleEl.innerText || titleEl.textContent || '').trim();
      let href = titleEl.getAttribute('href') || '';

      if (!title || title.length < 2) return;

      if (href.startsWith('//')) href = 'https:' + href;
      else if (href.startsWith('/')) href = 'https://www.zhihu.com' + href;

      const authorEl = item.querySelector('.UserLink-link, .AuthorInfo-name, [itemprop="name"], .AuthorInfo');
      const rawAuthor = authorEl ? (authorEl.innerText || authorEl.textContent || '') : '';
      const author = authorEl ? this.cleanAuthorName(rawAuthor) : '知乎推荐';

      const excerptEl = item.querySelector('.RichText, .ContentItem-excerpt, .HotItem-excerpt, .CopyrightRichText-richText, .RichContent-inner');
      const excerpt = excerptEl ? (excerptEl.innerText || excerptEl.textContent || '').trim() : '';

      const metricsEl = item.querySelector('.ContentItem-actions, .HotItem-metrics, .ContentItem-meta');
      const metrics = metricsEl ? (metricsEl.innerText || metricsEl.textContent || '').replace(/\s+/g, ' ').trim() : '';

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

    // 2. Fallback to js-initialData JSON state if DOM extraction found nothing
    if (feedList.length === 0) {
      const initialDataEl = targetDoc.getElementById('js-initialData');
      if (initialDataEl && initialDataEl.textContent) {
        try {
          const json = JSON.parse(initialDataEl.textContent);
          const state = json?.initialState || json;
          const feeds = state?.topstory?.recommend?.data ||
                        state?.topstory?.hotList ||
                        (state?.entities?.answers ? Object.values(state.entities.answers) : null) ||
                        (state?.entities?.articles ? Object.values(state.entities.articles) : null);

          if (Array.isArray(feeds)) {
            feeds.forEach((f, idx) => {
              const target = f.target || f;
              const title = target.question?.title || target.title || '';
              let href = target.url || target.link?.url || '';
              if (target.question?.id) href = `https://www.zhihu.com/question/${target.question.id}`;
              if (target.id && !href) {
                if (target.type === 'answer' || target.question) href = `https://www.zhihu.com/question/${target.question?.id || '0'}/answer/${target.id}`;
                else if (target.type === 'article') href = `https://zhuanlan.zhihu.com/p/${target.id}`;
              }
              if (title && href && !seenUrls.has(href)) {
                seenUrls.add(href);
                feedList.push({
                  id: feedList.length + 1,
                  title: title,
                  href: href,
                  author: target.author?.name || '知乎用户',
                  excerpt: (target.excerpt || title).replace(/<[^>]+>/g, '')
                });
              }
            });
          }
        } catch(e) {}
      }
    }

    // 3. Fallback: Parse any title links in targetDoc
    if (feedList.length === 0) {
      links.forEach((linkEl) => {
        const title = (linkEl.innerText || linkEl.textContent || '').trim();
        let href = linkEl.getAttribute('href') || '';
        if (title.length >= 4 && href && !seenUrls.has(href)) {
          if (href.startsWith('//')) href = 'https:' + href;
          else if (href.startsWith('/')) href = 'https://www.zhihu.com' + href;
          seenUrls.add(href);
          feedList.push({
            id: feedList.length + 1,
            title: title,
            href: href,
            author: '知乎推荐',
            excerpt: title
          });
        }
      });
    }

    return {
      type: 'feed',
      title: (targetDoc.title ? targetDoc.title.replace('- 知乎', '').trim() : '') || '知乎推荐 Feed',
      feedList: feedList
    };
  },

  /**
   * Parse any Document object or HTML string
   */
  parsePage: function(doc = (typeof document !== 'undefined' ? document : null), url = (typeof window !== 'undefined' ? window.location.href : '')) {
    const pageType = this.getPageType(doc, url);
    let data = { type: pageType, title: (doc && doc.title) ? doc.title.replace('- 知乎', '').trim() : '知乎文档', answers: [], feedList: [] };

    if (pageType === 'question') {
      data = this.parseQuestionPage(doc, url);
    } else if (pageType === 'article') {
      data = this.parseArticlePage(doc, url);
    } else if (pageType === 'hot') {
      data = this.parseHotPage(doc);
    } else {
      data = this.parseFeedPage(doc);
    }
    return data;
  },

  /**
   * Generate filename for tab based on parsed data and URL
   */
  getFileName: function(parsedData, url = '') {
    const targetUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
    const type = parsedData ? parsedData.type : '';

    if (type === 'question' || targetUrl.includes('/question/')) {
      const qid = parsedData?.questionId || targetUrl.match(/question\/(\d+)/)?.[1] || 'doc';
      return `question_${qid}.ts`;
    }
    if (type === 'article' || targetUrl.includes('/p/')) {
      const pid = parsedData?.articleId || targetUrl.match(/p\/(\d+)/)?.[1] || 'doc';
      return `article_${pid}.ts`;
    }
    if (type === 'hot' || targetUrl.includes('/hot')) {
      return 'hot_rank.ts';
    }
    if (targetUrl.includes('/follow')) {
      return 'following.ts';
    }
    if (type === 'search' || targetUrl.includes('/search')) {
      const qMatch = targetUrl.match(/q=([^&]+)/)?.[1];
      const qClean = qMatch ? decodeURIComponent(qMatch).replace(/[^a-zA-Z0-9_-]/g, '_') : 'query';
      return `search_${qClean || 'result'}.json`;
    }

    return 'recommend.ts';
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
      code += `<span class="syn-kw">export const</span> <span class="syn-var">answer_${idx + 1}</span>: <span class="syn-type">Answer</span> = {\n`;
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
  return String(str).replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');
}

if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
