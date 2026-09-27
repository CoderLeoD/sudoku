import { useEffect, useState } from 'react'
import { Icon } from '../icons.jsx'
import { DATA_SOURCE } from '../data/dataServices.js'
import { useAuth } from './AuthContext.jsx'

const EMPTY_FORM = { name: '', email: '', password: '', confirmPassword: '' }

export function AuthModal({ open, onClose }) {
  const { user, login, register, logout } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const usesServer = DATA_SOURCE === 'server'

  useEffect(() => {
    if (!open) return undefined
    setMode('login')
    setForm(EMPTY_FORM)
    setError('')
    setSubmitting(false)
    const closeOnEscape = (event) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open, onClose])

  if (!open) return null

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    setError('')
  }

  const switchMode = (nextMode) => {
    setMode(nextMode)
    setForm(EMPTY_FORM)
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (mode === 'register' && form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      if (mode === 'register') await register(form)
      else await login(form)
      onClose()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '操作失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const initial = user?.name?.trim().charAt(0).toLocaleUpperCase() || '数'

  return (
    <div className="modal-backdrop auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="modal auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="关闭"><Icon name="close" /></button>

        {user ? (
          <div className="account-panel">
            <span className="account-avatar account-avatar-large">{initial}</span>
            <span className="eyebrow">欢迎回来</span>
            <h2 id="auth-title">{user.name}</h2>
            <p className="account-email">{user.email}</p>
            <div className="local-data-note">
              <strong>{usesServer ? '服务器账户' : '本地数据库账户'}</strong>
              <span>{usesServer ? '当前账户由 sudoku-server 保存，可在不同设备登录。' : '当前账户保存在这台设备的 IndexedDB 数据库中。'}</span>
            </div>
            <button className="auth-secondary-button" type="button" onClick={() => { logout(); onClose() }}>退出登录</button>
          </div>
        ) : (
          <>
            <span className="modal-symbol auth-symbol">{mode === 'login' ? '入' : '新'}</span>
            <span className="eyebrow">{mode === 'login' ? '继续你的专注' : '留下你的足迹'}</span>
            <h2 id="auth-title">
              {mode === 'login' ? '登录方寸' : usesServer ? '创建服务器账户' : '创建本地账户'}
            </h2>

            <div className="auth-tabs" role="tablist" aria-label="账户操作">
              <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>登录</button>
              <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>注册</button>
            </div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <label>
                  <span>昵称</span>
                  <input name="name" value={form.name} onChange={updateField} autoComplete="nickname" placeholder="如何称呼你" minLength="2" maxLength="24" required />
                </label>
              )}
              <label>
                <span>邮箱</span>
                <input name="email" value={form.email} onChange={updateField} type="email" autoComplete="email" placeholder="name@example.com" required />
              </label>
              <label>
                <span>密码</span>
                <input name="password" value={form.password} onChange={updateField} type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? '输入密码' : '至少 8 个字符'} minLength="8" required />
              </label>
              {mode === 'register' && (
                <label>
                  <span>确认密码</span>
                  <input name="confirmPassword" value={form.confirmPassword} onChange={updateField} type="password" autoComplete="new-password" placeholder="再次输入密码" minLength="8" required />
                </label>
              )}

              <p className={`auth-error ${error ? 'visible' : ''}`} role="alert">{error || ' '}</p>
              <button className="auth-submit" type="submit" disabled={submitting}>
                {submitting ? '请稍候…' : mode === 'login' ? '登录' : '注册并登录'}
              </button>
            </form>

            <p className="auth-privacy">
              {usesServer
                ? '账户将提交到已配置的 sudoku-server；登录令牌保存在当前设备。'
                : '账户数据保存在本地 IndexedDB；清除浏览器数据或应用数据将会移除账户。'}
            </p>
          </>
        )}
      </section>
    </div>
  )
}
