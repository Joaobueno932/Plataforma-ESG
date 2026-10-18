// Ícones Iconify usados pelo original, embutidos para funcionar offline.
import { addCollection } from "@iconify/react";

const collections = [
 {
  "prefix": "gg",
  "lastModified": 1722793900,
  "aliases": {},
  "width": 24,
  "height": 24,
  "icons": {
   "close-r": {
    "body": "<g fill=\"currentColor\"><path d=\"M16.396 7.757a1 1 0 0 1 0 1.415l-2.982 2.981l2.676 2.675a1 1 0 1 1-1.415 1.415L12 13.567l-2.675 2.676a1 1 0 0 1-1.415-1.415l2.676-2.675l-2.982-2.981A1 1 0 1 1 9.02 7.757L12 10.74l2.981-2.982a1 1 0 0 1 1.415 0\"/><path fill-rule=\"evenodd\" d=\"M4 1a3 3 0 0 0-3 3v16a3 3 0 0 0 3 3h16a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3zm16 2H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1\" clip-rule=\"evenodd\"/></g>"
   }
  }
 },
 {
  "prefix": "mdi",
  "lastModified": 1737398331,
  "aliases": {},
  "width": 24,
  "height": 24,
  "icons": {
   "email-fast-outline": {
    "body": "<path fill=\"currentColor\" d=\"M22 5.5H9c-1.1 0-2 .9-2 2v9a2 2 0 0 0 2 2h13c1.11 0 2-.89 2-2v-9a2 2 0 0 0-2-2m0 11H9V9.17l6.5 3.33L22 9.17zm-6.5-5.69L9 7.5h13zM5 16.5c0 .17.03.33.05.5H1c-.552 0-1-.45-1-1s.448-1 1-1h4zM3 7h2.05c-.02.17-.05.33-.05.5V9H3c-.55 0-1-.45-1-1s.45-1 1-1m-2 5c0-.55.45-1 1-1h3v2H2c-.55 0-1-.45-1-1\"/>"
   },
   "phone": {
    "body": "<path fill=\"currentColor\" d=\"M6.62 10.79c1.44 2.83 3.76 5.15 6.59 6.59l2.2-2.2c.28-.28.67-.36 1.02-.25c1.12.37 2.32.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57c.11.35.03.74-.25 1.02z\"/>"
   }
  }
 },
 {
  "prefix": "ph",
  "lastModified": 1714973607,
  "aliases": {},
  "width": 256,
  "height": 256,
  "icons": {
   "x-circle-bold": {
    "body": "<path fill=\"currentColor\" d=\"M168.49 104.49L145 128l23.52 23.51a12 12 0 0 1-17 17L128 145l-23.51 23.52a12 12 0 0 1-17-17L111 128l-23.49-23.51a12 12 0 0 1 17-17L128 111l23.51-23.52a12 12 0 0 1 17 17ZM236 128A108 108 0 1 1 128 20a108.12 108.12 0 0 1 108 108m-24 0a84 84 0 1 0-84 84a84.09 84.09 0 0 0 84-84\"/>"
   }
  }
 },
 {
  "prefix": "basil",
  "lastModified": 1754898635,
  "aliases": {},
  "width": 24,
  "height": 24,
  "icons": {
   "upload-solid": {
    "body": "<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M5 16.25a.75.75 0 0 1 .75.75v2c0 .138.112.25.25.25h12a.25.25 0 0 0 .25-.25v-2a.75.75 0 0 1 1.5 0v2A1.75 1.75 0 0 1 18 20.75H6A1.75 1.75 0 0 1 4.25 19v-2a.75.75 0 0 1 .75-.75m5.738-.123a.99.99 0 0 1-.989-.905a37 37 0 0 1-.08-5.27a42 42 0 0 1-.741-.048l-1.49-.109a.76.76 0 0 1-.585-1.167a15.6 15.6 0 0 1 4.032-4.258l.597-.429a.89.89 0 0 1 1.036 0l.597.43a15.6 15.6 0 0 1 4.032 4.257a.76.76 0 0 1-.585 1.167l-1.49.109q-.37.027-.74.047c.1 1.757.072 3.518-.082 5.27a.99.99 0 0 1-.988.906z\" clip-rule=\"evenodd\"/>"
   },
   "download-solid": {
    "body": "<path fill=\"currentColor\" fill-rule=\"evenodd\" d=\"M5 16.25a.75.75 0 0 1 .75.75v2c0 .138.112.25.25.25h12a.25.25 0 0 0 .25-.25v-2a.75.75 0 0 1 1.5 0v2A1.75 1.75 0 0 1 18 20.75H6A1.75 1.75 0 0 1 4.25 19v-2a.75.75 0 0 1 .75-.75\" clip-rule=\"evenodd\"/><path fill=\"currentColor\" d=\"M10.738 3.75a.99.99 0 0 0-.988.906a37 37 0 0 0-.082 5.27q-.37.02-.74.047l-1.49.109a.76.76 0 0 0-.585 1.167a15.6 15.6 0 0 0 4.032 4.258l.597.429a.89.89 0 0 0 1.036 0l.597-.429a15.6 15.6 0 0 0 4.032-4.258a.76.76 0 0 0-.585-1.167l-1.49-.109a42 42 0 0 0-.74-.047a37 37 0 0 0-.081-5.27a.99.99 0 0 0-.989-.906z\"/>"
   }
  }
 },
 {
  "prefix": "mingcute",
  "lastModified": 1785500937,
  "aliases": {},
  "width": 24,
  "height": 24,
  "icons": {
   "send-line": {
    "body": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m14 10l-4 4m-.21.3l3.588 6.195a.25.25 0 0 0 .451-.04l5.646-15.61a.25.25 0 0 0-.32-.32L3.545 10.17a.25.25 0 0 0-.04.451L9.7 14.21a.25.25 0 0 1 .09.091\"/><path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" stroke-width=\"2\" d=\"m14 10l-4 4m-.21.3l3.588 6.196a.25.25 0 0 0 .45-.04l5.647-15.61a.25.25 0 0 0-.32-.32l-15.61 5.646a.25.25 0 0 0-.04.451L9.7 14.21a.25.25 0 0 1 .09.09\"/>"
   }
  }
 }
];

collections.forEach((c) => addCollection(c));
