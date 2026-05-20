import { useEffect } from 'react'

// SPA shim: this post lives as static HTML at /blog/como-monetizar-canal-telegram.
// When the user navigates here from the React BlogIndex (Link), we hard-redirect
// to the static page so they get the SEO-optimized HTML version with full schema.
export default function MonetizarCanalTelegramPilar() {
  useEffect(() => {
    window.location.replace('/blog/como-monetizar-canal-telegram')
  }, [])
  return null
}
