import { FiSun, FiMoon } from 'react-icons/fi'
import { useTheme } from '../context/ThemeContext.jsx'

export default function ThemeToggle({ variant = 'navbar' }) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  if (variant === 'sidebar') {
    return (
      <button
        onClick={toggleTheme}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-medium transition-all duration-200 text-[var(--color-moss)] hover:text-[var(--color-bone)] hover:bg-[var(--color-ink-3)]"
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? <FiSun size={17} /> : <FiMoon size={17} />}
        {isDark ? 'Light Mode' : 'Dark Mode'}
      </button>
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg transition-all duration-200 text-[var(--color-moss)] hover:text-[var(--color-acid)] hover:bg-[var(--color-ink-3)]"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
    </button>
  )
}
