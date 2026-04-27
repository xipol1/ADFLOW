import React from 'react'

function Bone({ className = '', style = {} }) {
  return (
    <div
      className={`rounded-md animate-pulse ${className}`}
      style={{ background: 'var(--bg3, #161B22)', ...style }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--surface, #0D1117)', border: '1px solid var(--border, #21262D)' }}
    >
      <div className="flex items-start gap-3">
        <Bone className="w-10 h-10 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Bone className="h-3.5 w-3/4" />
          <Bone className="h-2.5 w-1/2" />
        </div>
      </div>
      <div className="flex gap-1.5">
        <Bone className="h-5 w-16 rounded-md" />
        <Bone className="h-5 w-14 rounded-md" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Bone className="h-12 rounded-lg" />
        <Bone className="h-12 rounded-lg" />
        <Bone className="h-12 rounded-lg" />
        <Bone className="h-12 rounded-lg" />
      </div>
      <Bone className="h-1 rounded-full mt-1" />
      <div className="flex justify-between items-center pt-2" style={{ borderTop: '1px solid var(--border)' }}>
        <Bone className="h-6 w-12 rounded-md" />
        <Bone className="h-7 w-20 rounded-lg" />
      </div>
    </div>
  )
}

export function TableRowSkeleton({ cols = 8 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <Bone className="h-3 rounded" style={{ width: i === 1 ? '70%' : '60%' }} />
        </td>
      ))}
    </tr>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-start gap-4">
        <Bone className="w-20 h-20 rounded-2xl flex-shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <Bone className="h-6 w-48" />
          <Bone className="h-3.5 w-32" />
          <div className="flex gap-2 pt-1"><Bone className="h-5 w-16 rounded-md" /><Bone className="h-5 w-20 rounded-md" /></div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Bone key={i} className="h-20 rounded-xl" />)}
      </div>
      <Bone className="h-48 rounded-xl" />
      <Bone className="h-56 rounded-xl" />
    </div>
  )
}

export default function LoadingSkeleton({ type = 'card', count = 1, cols }) {
  if (type === 'card') {
    return <>{Array.from({ length: count }).map((_, i) => <CardSkeleton key={i} />)}</>
  }
  if (type === 'table') {
    return <>{Array.from({ length: count }).map((_, i) => <TableRowSkeleton key={i} cols={cols} />)}</>
  }
  if (type === 'profile') return <ProfileSkeleton />
  return <CardSkeleton />
}
