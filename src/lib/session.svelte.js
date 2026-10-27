import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db, googleProvider } from './firebase'

// ready: first auth check finished; allowed: user's email is in /allowedUsers
export const session = $state({ ready: false, user: null, allowed: false })

onAuthStateChanged(auth, async user => {
  let allowed = false
  if (user?.email) {
    try {
      allowed = (await getDoc(doc(db, 'allowedUsers', user.email))).exists()
    } catch {
      allowed = false
    }
  }
  if (auth.currentUser !== user) return // auth changed while we were checking
  session.user = user
  session.allowed = allowed
  session.ready = true
})

export const signIn = () => signInWithPopup(auth, googleProvider)
export const signOut = () => fbSignOut(auth)
