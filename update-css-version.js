#!/usr/bin/env node
// CSS バージョン更新スクリプト
const fs = require('fs');
const path = require('path');

const VERSION = new Date().toISOString().split('T')[0].replace(/-/g, '');
const HTML_PATH = path.join(__dirname, 'public', 'index.html');
const CSS_PATH = path.join(__dirname, 'public', 'css', 'styles.css');

// HTMLファイルのCSSバージョンを更新
if (fs.existsSync(HTML_PATH)) {
    let htmlContent = fs.readFileSync(HTML_PATH, 'utf8');
    htmlContent = htmlContent.replace(
        /href="css\/styles\.css\?v=[\d\.]+"/g,
        `href="css/styles.css?v=${VERSION}"`
    );
    fs.writeFileSync(HTML_PATH, htmlContent);
    console.log(`HTML updated with CSS version: ${VERSION}`);
}

// CSSファイルのバージョンコメントを更新
if (fs.existsSync(CSS_PATH)) {
    let cssContent = fs.readFileSync(CSS_PATH, 'utf8');
    cssContent = cssContent.replace(
        /Version: [\d\.-]+/g,
        `Version: ${VERSION}`
    );
    cssContent = cssContent.replace(
        /Last Updated: [\d\.-]+/g,
        `Last Updated: ${new Date().toISOString().split('T')[0]}`
    );
    fs.writeFileSync(CSS_PATH, cssContent);
    console.log(`CSS version updated to: ${VERSION}`);
}
