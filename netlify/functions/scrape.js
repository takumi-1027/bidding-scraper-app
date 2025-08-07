// 必要なパッケージをインポート
const fetch = require('node-fetch');
const cheerio = require('cheerio');

// Netlify Functionsのハンドラー関数
exports.handler = async function(event, context) {
  // POSTリクエストのみ受け付ける
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // リクエストからサイトとキーワードを取得
    const { sites, keywords } = JSON.parse(event.body);
    const results = [];
    
    // 各サイトをスクレイピング
    for (const site of sites) {
      try {
        // サイトのHTMLを取得
        const response = await fetch(site, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        const html = await response.text();
        
        // HTML解析
        const $ = cheerio.load(html);
        
        // 記事や投稿を探す（サイトによって調整が必要）
        $('article, .news-item, .post, .entry, div.news, .content').each((i, element) => {
          const title = $(element).find('h1, h2, h3, .title, .headline').first().text().trim();
          const url = $(element).find('a').first().attr('href');
          const content = $(element).text().trim();
          
          // キーワードとマッチするか確認
          const matchedKeywords = keywords.filter(keyword => 
            title.includes(keyword) || content.includes(keyword)
          );
          
          if (matchedKeywords.length > 0 && url && title) {
            // 相対URLを絶対URLに変換
            let fullUrl;
            try {
              fullUrl = url.startsWith('http') ? url : new URL(url, site).toString();
            } catch (e) {
              fullUrl = site + (url.startsWith('/') ? url : '/' + url);
            }
            
            // 日付の取得（存在する場合）
            const dateText = $(element).find('.date, time, .published').first().text().trim();
            const currentDate = new Date();
            
            results.push({
              url: fullUrl,
              title: title,
              keywords: matchedKeywords,
              date: currentDate.toLocaleDateString('ja-JP')
            });
          }
        });
      } catch (error) {
        console.log(`Error scraping ${site}:`, error.message);
      }
      
      // サイトに負荷をかけないように1秒待機
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({ 
        success: true, 
        results: results
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false, 
        error: error.message 
      })
    };
  }
};
