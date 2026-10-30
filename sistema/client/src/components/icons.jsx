// Ícones de contorno (estilo "lucide"), simples e leves, sem depender de
// nenhuma biblioteca externa — usados no menu lateral e nos cabeçalhos de
// página, inspirados no visual do Multi Foco.
function Icon({ children, size = 18, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconDashboard(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Icon>
  );
}

export function IconClients(props) {
  return (
    <Icon {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5" />
      <circle cx="17.5" cy="8.5" r="2.4" />
      <path d="M15.8 14.7c2.3.3 4.2 2.3 4.2 5.3" />
    </Icon>
  );
}

export function IconCatalog(props) {
  return (
    <Icon {...props}>
      <path d="M20.5 7.5 12 3 3.5 7.5 12 12l8.5-4.5Z" />
      <path d="M3.5 7.5V16l8.5 4.5L20.5 16V7.5" />
      <path d="M12 12v8.5" />
    </Icon>
  );
}

export function IconBudgets(props) {
  return (
    <Icon {...props}>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
      <path d="M8.5 13h7M8.5 16.5h5" />
    </Icon>
  );
}

export function IconServiceOrders(props) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="3.5" width="15" height="17" rx="1.6" />
      <path d="M9 3.5V6h6V3.5" />
      <path d="M8.5 12.5l2 2 4.5-4.5" />
    </Icon>
  );
}

export function IconFinancial(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v9M15 9.8c0-1.3-1.3-2.3-3-2.3s-3 .9-3 2.2c0 2.9 6 1.4 6 4.3 0 1.3-1.3 2.3-3 2.3s-3-1-3-2.3" />
    </Icon>
  );
}

export function IconContracts(props) {
  return (
    <Icon {...props}>
      <path d="M6.5 2.5h8l4 4v14a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z" />
      <path d="M14 2.5v4h4" />
      <path d="M8.5 11h7M8.5 14.5h7M8.5 18h4" />
    </Icon>
  );
}

export function IconLogout(props) {
  return (
    <Icon {...props}>
      <path d="M9 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </Icon>
  );
}

export function IconCollapse(props) {
  return (
    <Icon {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Icon>
  );
}

export function IconSearch(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Icon>
  );
}
