const KEY = "ecokids:newsletter:subscribers";

export interface Subscriber {
  email: string;
  date: string;
}

export function getSubscribers(): Subscriber[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Subscriber[]) : [];
  } catch {
    return [];
  }
}

export function addSubscriber(email: string) {
  const current = getSubscribers();
  if (current.some((s) => s.email.toLowerCase() === email.toLowerCase())) return;
  const next = [...current, { email, date: new Date().toISOString() }];
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* no-op */
  }
}

export function removeSubscriber(email: string) {
  const next = getSubscribers().filter((s) => s.email !== email);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* no-op */
  }
}
