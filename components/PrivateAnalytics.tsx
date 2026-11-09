'use client';

import { Analytics, type BeforeSend } from '@vercel/analytics/next';

/** Page URLs can carry deposit addresses and memos, so they never leave the browser as-is. */
const redactUrl: BeforeSend = (event) => {
  const url = new URL(event.url);
  url.search = '';
  url.hash = '';
  if (url.pathname.startsWith('/swap/')) url.pathname = '/swap/[depositAddress]';
  return { ...event, url: url.toString() };
};

export function PrivateAnalytics() {
  return <Analytics beforeSend={redactUrl} />;
}
