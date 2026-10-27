import adapter from '@sveltejs/adapter-static'

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // SPA mode: every route falls back to index.html (see rewrites in firebase.json)
  kit: { adapter: adapter({ fallback: 'index.html' }) },
  preprocess: []
}
export default config
