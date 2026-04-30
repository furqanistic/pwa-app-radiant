import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

const SpaSyncContext = createContext({
  isSyncingSelectedSpa: false,
  setSpaSyncing: () => {},
})

export function SpaSyncProvider({ children }) {
  const [isSyncingSelectedSpa, setSpaSyncing] = useState(false)

  const setSpaSyncingStable = useCallback((updater) => {
    setSpaSyncing(updater)
  }, [])

  const value = useMemo(
    () => ({
      isSyncingSelectedSpa,
      setSpaSyncing: setSpaSyncingStable,
    }),
    [isSyncingSelectedSpa, setSpaSyncingStable]
  )

  return (
    <SpaSyncContext.Provider value={value}>{children}</SpaSyncContext.Provider>
  )
}

export function useSpaSync() {
  return useContext(SpaSyncContext)
}
