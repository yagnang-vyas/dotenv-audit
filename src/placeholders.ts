const SECRET_KEY = /(PASS(WORD)?|SECRET|TOKEN|API_?KEY|PRIVATE_?KEY|CREDENTIAL)/i;

const PLACEHOLDER =
  /^(?:changeme|change_me|todo|replace_me|secret|password|x{3,}|your[_-].+[_-]here|<.*>)$/i;

/** A key is secret-looking if the schema says so or its name suggests a credential. */
export function isSecretLookingKey(key: string, markedSecret = false): boolean {
  return markedSecret || SECRET_KEY.test(key);
}

/** True for well-known placeholder values such as `changeme` or `<your-token>`. */
export function isPlaceholder(value: string): boolean {
  return PLACEHOLDER.test(value.trim());
}
