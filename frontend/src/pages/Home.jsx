import { Link } from "react-router-dom";
import { CalendarCheck, Clock, Heart, Scissors } from "lucide-react";
export default function Home() {
  return (
    <div className="hero">
      <div className="hero-card">
        <img className="hero-logo" src="/logo_salao.png" />
        <div>
          <span className="eyebrow">Beleza, cuidado e praticidade</span>
          <h1>Agende seu momento de cuidado.</h1>
          <p>
            Escolha a cabeleireira, o serviço e o melhor horário para você. O
            sistema calcula a disponibilidade automaticamente.
          </p>
          <Link className="btn" to="/agendar">
            Agendar horário <CalendarCheck size={18} />
          </Link>
        </div>
      </div>
      <section className="features">
        <article>
          <Scissors />
          <h3>Profissionais</h3>
          <p>Escolha a cabeleireira disponível.</p>
        </article>
        <article>
          <Clock />
          <h3>Horários inteligentes</h3>
          <p>A duração do serviço entra automaticamente no cálculo.</p>
        </article>
        <article>
          <Heart />
          <h3>Atendimento especial</h3>
          <p>Confirmações e lembretes chegam por e-mail.</p>
        </article>
      </section>
    </div>
  );
}
