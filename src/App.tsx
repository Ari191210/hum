import { PhoneCheck } from './features/PhoneCheck'
import { detectBrowser } from './platform/browser'

const browser = detectBrowser(navigator.userAgent)

export default function App() {
  return <PhoneCheck browser={browser} />
}
