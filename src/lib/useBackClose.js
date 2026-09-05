import { useEffect, useRef } from "react";

// =============================================================================
//  TASTO INDIETRO DEL TELEFONO
// =============================================================================
//  Su Android il tasto indietro esce dall'app se non trova nulla da chiudere
//  nella cronologia. In una app a schermata unica come questa la cronologia è
//  sempre vuota, quindi da una scheda pianta — o peggio, con una foto aperta a
//  schermo intero — il tasto indietro buttava fuori di colpo.
//
//  Rimedio: ogni "livello" aperto (una vista diversa dalla Collezione, un
//  pannello, il visore foto) aggiunge una tappa nella cronologia. Il tasto
//  indietro consuma quella tappa e chiude UN livello. Dalla Collezione, che è
//  il livello base, il tasto indietro esce davvero: è ciò che ci si aspetta.
//
//  Perché una pila condivisa e un solo ascoltatore: l'evento "indietro" arriva
//  a tutti gli ascoltatori registrati. Con un ascoltatore per livello, aprendo
//  scheda + foto il tasto indietro le chiudeva ENTRAMBE e riportava alla
//  Collezione in un colpo solo. Deve rispondere soltanto il livello in cima.
// =============================================================================

// Livelli aperti, il più recente in fondo.
const pila = [];

// Quanti eventi "indietro" abbiamo provocato noi chiudendo un livello da dentro
// l'app: vanno ignorati, altrimenti chiuderebbero anche il livello sottostante.
let daIgnorare = 0;

let ascoltatoreInstallato = false;

function installaAscoltatore() {
  if (ascoltatoreInstallato || typeof window === "undefined") return;
  ascoltatoreInstallato = true;
  window.addEventListener("popstate", () => {
    if (daIgnorare > 0) {
      daIgnorare--;
      return;
    }
    const voce = pila.pop();
    voce?.chiudi();
  });
}

export function useBackClose(attivo, onBack) {
  // La funzione di chiusura cambia ad ogni render: tenuta in un ref, così
  // l'effetto non si ri-esegue (ri-eseguirlo aggiungerebbe altre tappe).
  const chiudi = useRef(onBack);
  chiudi.current = onBack;

  useEffect(() => {
    if (!attivo) return;
    installaAscoltatore();

    const voce = { chiudi: () => chiudi.current?.() };
    pila.push(voce);
    window.history.pushState({ livelloBonsai: pila.length }, "");

    return () => {
      const i = pila.indexOf(voce);
      // Già tolto dalla pila: il livello è stato chiuso dal tasto indietro,
      // la tappa è stata consumata dal browser e non c'è altro da fare.
      if (i === -1) return;

      // Chiuso da dentro l'app (la X, "Indietro" a schermo, un salvataggio):
      // la tappa aggiunta va tolta, altrimenti resterebbe nella cronologia e
      // il primo tasto indietro successivo sembrerebbe non fare nulla.
      pila.splice(i, 1);
      daIgnorare++;
      window.history.back();
    };
  }, [attivo]);
}
