const fs = require('fs');
const xml = fs.readFileSync('temp_g1.xml','utf8');
function parse(xmlString){
  const items=[];
  const itemRegex=/<item[^>]*>([\s\S]*?)<\/item>/g;
  let m;
  while((m=itemRegex.exec(xmlString))!==null){
    const itemContent=m[1];
    const titleMatch=/<title[^>]*>([\s\S]*?)<\/title>/.exec(itemContent);
    const descMatch=/<description[^>]*>([\s\S]*?)<\/description>/.exec(itemContent);
    const linkMatch=/<link[^>]*>([\s\S]*?)<\/link>/.exec(itemContent);
    const pubDateMatch=/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/.exec(itemContent);
    let imageUrl="";
    const mediaMatch=/<media:content[^>]*url=\"([^\"]*)\"/.exec(itemContent);
    if(mediaMatch) imageUrl=mediaMatch[1];
    if(!imageUrl && descMatch && descMatch[1]){
      const imgMatch=/<img[^>]*src=["']([^"']+)["']/i.exec(descMatch[1]);
      if(imgMatch) imageUrl=imgMatch[1];
    }
    const title=titleMatch?titleMatch[1].replace(/<[^>]*>/g,'').replace(/&[a-zA-Z]+;/g,'').trim():"";
    const description=descMatch?descMatch[1].replace(/<[^>]*>/g,'').replace(/&[a-zA-Z]+;/g,'').trim().substring(0,300):"";
    const link=linkMatch?linkMatch[1].trim():"";
    const pubDate=pubDateMatch?pubDateMatch[1].trim():new Date().toISOString();
    if(title){items.push({title,description,link,pubDate,image:imageUrl})}
  }
  return items;
}
const items=parse(xml);
console.log('items', items.length);
console.log(items[0]);
