export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return 'N/A';
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const maskedName = name[0] + '*'.repeat(Math.max(0, name.length - 2)) + (name.length > 1 ? name[name.length - 1] : '');
  return `${maskedName}@${domain}`;
};
