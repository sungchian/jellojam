/**
 * useSeoMeta — lightweight meta tag manager, no external dependency.
 *
 * Sets <title>, <meta name="description">, Open Graph, and canonical URL.
 * Designed for the JelloJam storefront; ERP pages don't need SEO.
 *
 * Usage:
 *   import { useSeoMeta } from '@/composables/useSeoMeta'
 *   useSeoMeta({ title: '商品目錄', description: '瀏覽全系列 Jellycat 商品' })
 */

const SITE_NAME  = 'JelloJam'
const BASE_URL   = import.meta.env.VITE_SITE_URL || 'https://www.jellojam.com'
const DEFAULT_OG = `${BASE_URL}/og-default.jpg`

/**
 * @param {object} opts
 * @param {string} [opts.title]        — page title (without site name suffix)
 * @param {string} [opts.description]  — meta description (max ~155 chars)
 * @param {string} [opts.image]        — OG image URL (absolute)
 * @param {string} [opts.canonicalPath]— e.g. '/store/catalog' (will be prefixed with BASE_URL)
 * @param {string} [opts.type]         — OG type, default 'website'
 */
export function useSeoMeta({
  title,
  description,
  image,
  canonicalPath,
  type = 'website',
} = {}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — 北美代購精品`
  const desc      = description || 'JelloJam 提供 Jellycat、Trader Joe\'s 等北美精品代購，安心、快速、正品保證。'
  const ogImage   = image || DEFAULT_OG
  const canonical = canonicalPath ? `${BASE_URL}${canonicalPath}` : BASE_URL

  // <title>
  document.title = fullTitle

  // Helper: upsert a <meta> by name or property
  function setMeta(selector, attr, content) {
    let el = document.querySelector(selector)
    if (!el) {
      el = document.createElement('meta')
      const [k, v] = attr.includes('=') ? attr.split('=') : ['name', attr]
      el.setAttribute(k.trim(), v.trim().replace(/['"]/g, ''))
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }

  // Helper: upsert a <link>
  function setLink(rel, href) {
    let el = document.querySelector(`link[rel="${rel}"]`)
    if (!el) {
      el = document.createElement('link')
      el.setAttribute('rel', rel)
      document.head.appendChild(el)
    }
    el.setAttribute('href', href)
  }

  setMeta('meta[name="description"]',      'name=description',      desc)
  setMeta('meta[property="og:title"]',     'property=og:title',     fullTitle)
  setMeta('meta[property="og:description"]','property=og:description', desc)
  setMeta('meta[property="og:image"]',     'property=og:image',     ogImage)
  setMeta('meta[property="og:url"]',       'property=og:url',       canonical)
  setMeta('meta[property="og:type"]',      'property=og:type',      type)
  setMeta('meta[property="og:site_name"]', 'property=og:site_name', SITE_NAME)
  setMeta('meta[name="twitter:card"]',     'name=twitter:card',     'summary_large_image')
  setMeta('meta[name="twitter:title"]',    'name=twitter:title',    fullTitle)
  setMeta('meta[name="twitter:description"]','name=twitter:description', desc)
  setMeta('meta[name="twitter:image"]',    'name=twitter:image',    ogImage)
  setLink('canonical', canonical)
}
