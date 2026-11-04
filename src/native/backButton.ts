import { App } from '@capacitor/app'
import { isNativeApp } from './platform'

/**
 * Android hardware/gesture back button: go back in the app's history,
 * and close the app when there is nowhere left to go back to.
 */
export function registerBackButton(goBack: () => void, canGoBack: () => boolean) {
  if (!isNativeApp) return () => {}
  const listener = App.addListener('backButton', () => {
    if (canGoBack()) goBack()
    else App.exitApp()
  })
  return () => {
    listener.then((l) => l.remove())
  }
}
