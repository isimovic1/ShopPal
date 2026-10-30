import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Alert.alert that also works in the browser: react-native-web renders nothing
 * for it, so on web confirmations fall back to window.confirm / window.alert.
 */
export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const text = message ? `${title}\n\n${message}` : title;
  const action = buttons?.find((b) => b.style !== 'cancel');
  if (buttons && buttons.length > 1 && action) {
    if (window.confirm(text)) action.onPress?.();
    else buttons.find((b) => b.style === 'cancel')?.onPress?.();
    return;
  }
  window.alert(text);
  action?.onPress?.();
}
