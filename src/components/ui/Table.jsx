export function Table({ children, className = "" }) {
  return <table className={`table w-full ${className}`}>{children}</table>
}

export function TableHeader({ children, className = "" }) {
  return <thead className={className}>{children}</thead>
}

export function TableBody({ children, className = "" }) {
  return <tbody className={className}>{children}</tbody>
}

export function TableFooter({ children, className = "" }) {
  return <tfoot className={className}>{children}</tfoot>
}

export function TableRow({ children, className = "" }) {
  return <tr className={className}>{children}</tr>
}

export function TableHead({ children, className = "" }) {
  return <th className={className}>{children}</th>
}

export function TableCell({ children, className = "" }) {
  return <td className={className}>{children}</td>
}
