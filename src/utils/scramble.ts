const rnd = (n:number)=> Math.floor(Math.random()*n)
const choice = <T,>(arr: ReadonlyArray<T>)=> arr[rnd(arr.length)]
const mod = ["","'","2"] as const

const MOVES = {
  '333': { faces: ['R','L','U','D','F','B'] as const, len: 20 },
  '222': { faces: ['R','U','F'] as const, len: 9 },
  '333oh': { faces: ['R','L','U','D','F','B'] as const, len: 20 },
  '333bf': { faces: ['R','L','U','D','F','B'] as const, len: 20 },
  '444': { faces: ['R','L','U','D','F','B','Rw','Lw','Uw','Dw','Fw','Bw'] as const, len: 40 },
  '555': { faces: ['R','L','U','D','F','B','Rw','Lw','Uw','Dw','Fw','Bw'] as const, len: 60 },
  '666': { faces: ['R','L','U','D','F','B','3Rw','3Lw','3Uw','3Dw','3Fw','3Bw','Rw','Lw','Uw','Dw','Fw','Bw'] as const, len: 80 },
  '777': { faces: ['R','L','U','D','F','B','3Rw','3Lw','3Uw','3Dw','3Fw','3Bw','Rw','Lw','Uw','Dw','Fw','Bw'] as const, len: 100 },
  'pyram': { faces: ['R','L','U','B'] as const, tips: ['r','l','u','b'] as const, len: 11 },
  'skewb': { faces: ['R','L','U','B'] as const, len: 11 },
  'megaminx': { faces: ["R++","R--","D++","D--"] as const, len: 70 },
  'sq1': { faces: ['(x,y)','/'] as const, len: 20 },
  'clock': { faces: ['UR','DR','DL','UL','U','R','D','L','ALL'] as const, len: 14 },
  '333fm': { faces: ['R','L','U','D','F','B'] as const, len: 20 },
} as const

export type WCAEvent = keyof typeof MOVES

export function genScramble(event:WCAEvent='333'): string{
  const cfg = MOVES[event] || MOVES['333']

  if (event==='megaminx'){
    const faces = cfg.faces
    const s:string[] = []
    for (let i=0;i<cfg.len;i++){
      s.push(choice(faces))
      if ((i+1)%10===0) s.push('\n')
    }
    return s.join(' ')
  }

  if (event==='pyram'){
    const faces = cfg.faces
    const tips = (MOVES.pyram.tips ?? []) as ReadonlyArray<string>
    const s:string[] = []
    let last = ''
    for (let i=0;i<cfg.len;i++){
      let f = choice(faces) as string
      while (f===last) f = choice(faces) as string
      last = f
      s.push(f + choice(mod))
    }
    s.push(...tips.map(t=> Math.random()<0.5 ? t + choice(["","'"] as const) : '').filter(Boolean) as string[])
    return s.join(' ')
  }

  if (event==='skewb'){
    const faces = cfg.faces
    const s:string[] = []
    let last=''
    for (let i=0;i<cfg.len;i++){
      let f = choice(faces) as string
      while (f===last) f = choice(faces) as string
      last = f
      s.push(f + choice(["","'"] as const))
    }
    return s.join(' ')
  }

  if (event==='sq1'){
    const s:string[] = []
    for (let i=0;i<cfg.len;i++){
      const a = Math.floor(Math.random()*7)-3
      const b = Math.floor(Math.random()*7)-3
      s.push(`(${a},${b})`)
      if (Math.random()<0.9) s.push('/')
    }
    return s.join(' ')
  }

  if (event==='clock'){
    const pins = MOVES.clock.faces
    const s:string[] = []
    for (let i=0;i<cfg.len;i++){
      const p = choice(pins)
      const n = Math.floor(Math.random()*11) - 5 // -5..+5
      s.push(`${p} ${n}`)
    }
    return s.join('  ')
  }

  if (event==='333bf'){
    const faces = MOVES['333bf'].faces
    const s:string[] = []
    let last=''
    for (let i=0;i<20;i++){
      let f = choice(faces) as string
      while (f===last) f = choice(faces) as string
      last = f
      s.push(f + choice(mod))
    }
    const wide = ['Rw','Lw','Uw','Dw','Fw','Bw'] as const
    s.push(choice(wide) + choice(mod))
    s.push(choice(wide) + choice(mod))
    return s.join('\t')
  }

  // NxN and 3x3-like
  const faces = cfg.faces
  const s:string[] = []
  let last=''
  for (let i=0;i<cfg.len;i++){
    let f = choice(faces) as string
    while (f===last) f = choice(faces) as string
    last = f
    s.push(f + choice(mod))
  }
  return s.join('\t')
}
