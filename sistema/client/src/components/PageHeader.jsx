// Cabeçalho de página padrão: ícone em círculo + título + breadcrumb,
// com ações à direita — mesmo padrão usado em todas as telas do Multi Foco.
export default function PageHeader({ icon: Icon, title, breadcrumb, children }) {
  return (
    <div className="page-header">
      <div className="page-title-group">
        {Icon && (
          <div className="page-icon">
            <Icon size={20} />
          </div>
        )}
        <div>
          <h1>{title}</h1>
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="breadcrumb">
              {breadcrumb.map((item, i) => (
                <span key={i}>
                  {i > 0 && <span className="sep">•</span>}
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
