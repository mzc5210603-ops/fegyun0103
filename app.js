/* ============ 码刻 MARKQR — 生成 / 定制 / 解码 ============ */
"use strict";

const $ = s => document.querySelector(s);
const content = $("#content"), qrHost = $("#qrHost");
const fg = $("#fg"), bg = $("#bg"), ecc = $("#ecc");
const margin = $("#margin"), size = $("#size");
const meta = $("#meta"), hint = $("#hint"), fileId = $("#fileId");
const presets = $("#presets"), eccSeg = $("#eccSeg"), quickColors = $("#quickColors");
const drop = $("#drop"), fileIn = $("#file"), decodeOut = $("#decodeOut");
const marginVal = $("#marginVal"), sizeVal = $("#sizeVal");

let seq = 0;

/* ---------- 内容模板 ---------- */
const TEMPLATES = [
  ["网址", "url", "https://example.com", "https://example.com"],
  ["文本", "text", "一段任意文字…", "把这段文字刻成码。"],
  ["Wi-Fi", "wifi", "WIFI:T:WPA;S:网络名;P:密码;;", "WIFI:T:WPA;S:CafeWiFi;P:hellopass;;"],
  ["邮箱", "mail", "mailto:hello@example.com", "mailto:hello@example.com?subject=Hi&body=你好"],
  ["电话", "tel", "tel:13800000000", "tel:13800000000"],
  ["名片", "vcard", "BEGIN:VCARD …", "BEGIN:VCARD\nVERSION:3.0\nFN:张三\nORG:工作室\nEMAIL:hello@example.com\nTEL:13800000000\nURL:https://example.com\nEND:VCARD"],
];
TEMPLATES.forEach(([label, key, ph, body], i) => {
  const b = document.createElement("button");
  b.textContent = label;
  if (i === 0) b.classList.add("on");
  b.addEventListener("click", () => {
    presets.querySelectorAll("button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    content.placeholder = ph;
    content.value = body;
    render();
  });
  presets.appendChild(b);
});

/* ---------- 快捷配色 ---------- */
const QUICK = [
  ["#0a0c10", "#ffffff"],
  ["#4ea8ff", "#08090c"],
  ["#c9a962", "#0f1216"],
  ["#e0524a", "#fff7f0"],
  ["#2fb37a", "#f4fdf8"],
  ["#0a0c10", "#f5e6a8"],
];
QUICK.forEach(([f, b], i) => {
  const s = document.createElement("i");
  s.style.background = "linear-gradient(135deg," + f + " 0 50%," + b + " 50% 100%)";
  s.title = "前景 " + f + " / 背景 " + b;
  s.addEventListener("click", () => {
    fg.value = f; bg.value = b;
    render();
  });
  quickColors.appendChild(s);
});

/* ---------- 纠错等级分段 ---------- */
eccSeg.querySelectorAll("button").forEach(b => {
  b.addEventListener("click", () => {
    eccSeg.querySelectorAll("button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    ecc.value = b.dataset.v;
    render();
  });
});

/* ---------- 生成 ---------- */
function makeQr(text) {
  const levels = [ecc.value, "L"];
  for (const lv of levels) {
    for (const type of [0, 10, 20, 30, 40]) {
      try {
        const q = qrcode(type, lv);
        q.addData(text);
        q.make();
        return q;
      } catch (e) { /* 容量不足，继续尝试更大版本 */ }
    }
  }
  return null;
}

function render() {
  const text = content.value;
  qrHost.innerHTML = "";
  if (!text.trim()) {
    meta.textContent = "等待输入";
    hint.textContent = "字符数 0";
    return;
  }
  const qr = makeQr(text);
  if (!qr) {
    meta.textContent = "编码失败";
    hint.textContent = "内容超出容量上限，请缩短或降低纠错等级";
    return;
  }

  const svgStr = qr.createSvgTag({ cellSize: 4, margin: parseInt(margin.value, 10), scalable: true });
  const doc = new DOMParser().parseFromString(svgStr, "image/svg+xml");
  const svg = doc.documentElement;
  const r = doc.querySelector("rect");
  if (r) r.setAttribute("fill", bg.value);
  doc.querySelectorAll("path").forEach(p => p.setAttribute("fill", fg.value));
  qrHost.innerHTML = new XMLSerializer().serializeToString(svg);

  const px = parseInt(size.value, 10);
  qrHost.style.width = px + "px";
  qrHost.style.height = px + "px";

  const n = qr.getModuleCount();
  meta.textContent = n + " × " + n + " modules · " + ecc.value + " · " + px + "px";
  hint.textContent = "字符数 " + text.length + " · 已生成";
  marginVal.textContent = margin.value;
  sizeVal.textContent = size.value;
  fileId.textContent = "#" + String(++seq).padStart(4, "0");
}

/* ---------- 事件绑定 ---------- */
["input", "change"].forEach(ev => {
  [content, fg, bg, margin, size].forEach(n => n.addEventListener(ev, render));
});
margin.addEventListener("input", () => { marginVal.textContent = margin.value; });
size.addEventListener("input", () => { sizeVal.textContent = size.value; });

/* ---------- 导出 ---------- */
function svgXml() {
  const el = qrHost.querySelector("svg");
  return el ? new XMLSerializer().serializeToString(el) : null;
}
function svgToCanvas(cb) {
  const xml = svgXml();
  if (!xml) return;
  const img = new Image();
  img.onload = () => {
    const px = parseInt(size.value, 10) * 2;
    const c = document.createElement("canvas");
    c.width = c.height = px;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg.value;
    ctx.fillRect(0, 0, px, px);
    ctx.drawImage(img, 0, 0, px, px);
    cb(c);
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}
function save(url, name) {
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  setTimeout(() => a.remove(), 0);
}
$("#dlPng").addEventListener("click", () => {
  svgToCanvas(c => save(c.toDataURL("image/png"), "markqr-" + seq + ".png"));
});
$("#dlSvg").addEventListener("click", () => {
  const xml = svgXml();
  if (!xml) return;
  save("data:image/svg+xml;charset=utf-8," + encodeURIComponent('<?xml version="1.0" encoding="UTF-8"?>\n' + xml), "markqr-" + seq + ".svg");
});
$("#cpImg").addEventListener("click", () => {
  svgToCanvas(async c => {
    try {
      const blob = await new Promise(r => c.toBlob(r, "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      decodeOut.textContent = "已复制图片，可直接粘贴发送";
    } catch (e) {
      decodeOut.textContent = "复制失败：浏览器环境不支持剪贴板图片写入";
    }
  });
});

/* ---------- 解码 ---------- */
fileIn.addEventListener("change", e => decodeFile(e.target.files[0]));
["dragenter", "dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => decodeFile(e.dataTransfer.files[0]));
drop.addEventListener("click", () => fileIn.click());

function decodeFile(file) {
  if (!file) return;
  decodeOut.textContent = "解码中…";
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(d.data, c.width, c.height);
    URL.revokeObjectURL(url);
    decodeOut.textContent = code && code.data
      ? "✔ " + code.data
      : "× 未识别到二维码（图片过小、模糊或非二维码）";
  };
  img.onerror = () => { decodeOut.textContent = "× 图片加载失败"; };
  img.src = url;
}

/* ---------- 启动 ---------- */
presets.firstChild.click();
render();