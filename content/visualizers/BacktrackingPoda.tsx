"use client";

import { useMemo, useState } from "react";

import { thousands } from "@/lib/format";
import { useVisualizer, VizHeader, VizFooter } from "@/lib/visualizer";

// ---------------------------------------------------------------------------
// BacktrackingPoda, a otimização que não muda o algoritmo, muda quando ele
// desiste.
//
// A única coisa que o aluno precisa enxergar é que a poda não é um algoritmo
// diferente nem uma heurística que abre mão da resposta: é a mesma busca, com a
// verificação de validade acontecendo ANTES de descer em vez de depois. As duas
// versões devolvem exatamente as mesmas soluções, e a barra de nós visitados
// mostra a diferença de trabalho.
//
// O problema é o das n rainhas porque ele tem a propriedade rara de deixar as
// duas versões comparáveis linha a linha: sem poda é "monte todas as
// disposições e confira no fim", com poda é "não ponha uma rainha onde ela já é
// atacada". A diferença explode com n, e o card de razão é o que transforma
// isso em argumento.
//
// A tela mostra o tabuleiro de UMA solução, e não a busca inteira: a busca é
// assunto do visualizador de passo a passo, e aqui o que interessa é o total.
// Por isso é interativo sem linha do tempo: a variável é o tamanho do
// tabuleiro.
//
// Sobre a casca (contrato em `content/visualizers/README.md`):
//   · `total: 1` — não há linha do tempo, então somem o contador de passo, os
//     atalhos e a barra de progresso. O que resume o estado (quantas rainhas,
//     quantas soluções, a razão) entra como `children` do `VizHeader`, no lugar
//     onde ficaria o "passo N de M", com o rótulo junto.
//   · `collapsible: false` — não existe bloco dispensável. O tabuleiro, as
//     barras e os chips SÃO o conteúdo; inventar um bloco só para ganhar o
//     botão é o que a §2 do contrato proíbe. Por isso `measureOn` também fica
//     de fora: sem bloco para recolher não há decisão a medir.
//   · os chips de tamanho e de solução ficam no MIOLO, não no rodapé: eles não
//     são reprodução, e com `total: 1` o `VizFooter` sem `children` some
//     inteiro — que é o caso em que a casca DEVOLVE altura no artigo (§9).
// ---------------------------------------------------------------------------

type Resultado = { nos: number; solucoes: number[][]; podas: number };

// Sem poda: escolhe uma coluna por linha sem olhar nada, e só no fim confere se
// a disposição inteira é válida. É o "gere tudo e filtre" escrito em recursão.
function semPoda(n: number): Resultado {
  const solucoes: number[][] = [];
  const parcial: number[] = [];
  let nos = 0;
  const valida = (v: number[]) => {
    for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++)
        if (v[i] === v[j] || Math.abs(v[i] - v[j]) === j - i) return false;
    return true;
  };
  const rec = () => {
    nos++;
    if (parcial.length === n) {
      if (valida(parcial)) solucoes.push([...parcial]);
      return;
    }
    for (let c = 0; c < n; c++) {
      parcial.push(c);
      rec();
      parcial.pop();
    }
  };
  rec();
  return { nos, solucoes, podas: 0 };
}

// Com poda: antes de descer, confere se a rainha nova é atacada por alguma das
// já postas. O ramo inteiro que sairia daquela escolha deixa de existir.
function comPoda(n: number): Resultado {
  const solucoes: number[][] = [];
  const parcial: number[] = [];
  let nos = 0;
  let podas = 0;
  const seguro = (c: number) => {
    for (let i = 0; i < parcial.length; i++)
      if (parcial[i] === c || Math.abs(parcial[i] - c) === parcial.length - i) return false;
    return true;
  };
  const rec = () => {
    nos++;
    if (parcial.length === n) {
      solucoes.push([...parcial]);
      return;
    }
    for (let c = 0; c < n; c++) {
      if (!seguro(c)) {
        podas++;
        continue;
      }
      parcial.push(c);
      rec();
      parcial.pop();
    }
  };
  rec();
  return { nos, solucoes, podas };
}

// Para em 7 de propósito: com 8 rainhas a versão sem poda visita 19.173.961
// nós, e rodar isso no navegador para desenhar uma barra seria cobrar segundos
// de CPU do leitor. O número de 8 rainhas está no artigo, calculado pela
// fórmula da árvore cheia, e não medido aqui.
const TAMANHOS = [4, 5, 6, 7];

export function BacktrackingPoda() {
  const [n, setN] = useState(6);
  const sem = useMemo(() => semPoda(n), [n]);
  const com = useMemo(() => comPoda(n), [n]);
  const [qual, setQual] = useState(0);

  const viz = useVisualizer({
    title: "Visualizador · a poda: mesma resposta, uma fração do trabalho",
    total: 1,
    collapsible: false,
  });

  const mesmasSolucoes =
    sem.solucoes.map((s) => s.join(",")).sort().join("|") === com.solucoes.map((s) => s.join(",")).sort().join("|");
  const razao = sem.nos / com.nos;
  const sol = com.solucoes.length > 0 ? com.solucoes[Math.min(qual, com.solucoes.length - 1)] : [];

  return viz.inPanel(
    <figure {...viz.figureProps} style={{ margin: 0 }}>
      <VizHeader viz={viz}>
        <span className="viz-step">
          {n} rainhas · {com.solucoes.length} soluções · {razao.toFixed(1)}x menos nós com poda
        </span>
      </VizHeader>

      <div {...viz.bodyProps}>
        <div className="bigo-chips">
          {TAMANHOS.map((t) => (
            <button
              type="button"
              key={t}
              className={`bigo-chip${n === t ? " on" : ""}`}
              onClick={() => {
                setN(t);
                setQual(0);
              }}
              aria-pressed={n === t}
            >
              {t} rainhas
            </button>
          ))}
        </div>

        <p className="tt-legenda-arvore">
          O problema: pôr {n} rainhas num tabuleiro {n}x{n} sem que nenhuma ataque outra, ou seja, sem duas na
          mesma linha, coluna ou diagonal. As duas versões abaixo são o mesmo backtracking, e a única diferença
          é <strong>quando</strong> a validade é conferida.
        </p>

        <div className="ord-corrida">
          <div className="ord-linha">
            <div className="ord-linha-nome">
              Sem poda <span className="qs-explica">monta todas as disposições e confere no fim</span>
            </div>
            <div className="ord-medidas">
              <div className="ord-medida">
                <span className="ord-medida-rot">nós visitados</span>
                <div className="bb-barra">
                  <div className="bb-barra-fill" style={{ width: "100%" }} />
                  <span className="bb-barra-txt">{thousands(sem.nos)}</span>
                </div>
                <span className="ord-lei">
                  {thousands(Math.pow(n, n))} disposições possíveis, todas percorridas até o fim
                </span>
              </div>
              <div className="ord-medida">
                <span className="ord-medida-rot">soluções encontradas</span>
                <div className="bb-barra">
                  <div className="bb-barra-fill esc" style={{ width: "100%" }} />
                  <span className="bb-barra-txt">{sem.solucoes.length}</span>
                </div>
                <span className="ord-lei">a resposta certa, pelo caminho caro</span>
              </div>
            </div>
          </div>
          <div className="ord-linha">
            <div className="ord-linha-nome">
              Com poda <span className="qs-explica">não desce por um ramo que já é inválido</span>
            </div>
            <div className="ord-medidas">
              <div className="ord-medida melhor">
                <span className="ord-medida-rot">nós visitados</span>
                <div className="bb-barra">
                  <div className="bb-barra-fill" style={{ width: `${(com.nos / sem.nos) * 100}%` }} />
                  <span className="bb-barra-txt">{thousands(com.nos)}</span>
                </div>
                <span className="ord-lei">
                  {thousands(com.podas)} escolhas cortadas antes de virarem ramo
                </span>
              </div>
              <div className={`ord-medida${mesmasSolucoes ? " melhor" : ""}`}>
                <span className="ord-medida-rot">soluções encontradas</span>
                <div className="bb-barra">
                  <div className="bb-barra-fill esc" style={{ width: "100%" }} />
                  <span className="bb-barra-txt">{com.solucoes.length}</span>
                </div>
                <span className="ord-lei">
                  {mesmasSolucoes ? "exatamente as mesmas da versão sem poda" : "DIVERGIU da versão sem poda"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="hp-bloco">
          <div className="tt-painel-tit">
            Uma das soluções <em>clique para ver as outras</em>
          </div>
          <div className="bt-rainhas-topo">
            {com.solucoes.map((_, k) => (
              <button
                type="button"
                key={k}
                className={`bigo-chip${k === Math.min(qual, com.solucoes.length - 1) ? " on" : ""}`}
                onClick={() => setQual(k)}
                aria-pressed={k === Math.min(qual, com.solucoes.length - 1)}
              >
                {k + 1}
              </button>
            ))}
          </div>
          <div className="bt-sudoku-wrap">
            <div
              className="bt-rainhas"
              style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}
              role="img"
              aria-label={`Tabuleiro ${n} por ${n} com uma solução das ${n} rainhas: ${sol.map((c, r) => `linha ${r + 1} coluna ${c + 1}`).join(", ")}`}
            >
              {Array.from({ length: n * n }, (_, i) => {
                const r = Math.floor(i / n);
                const c = i % n;
                const temRainha = sol[r] === c;
                return (
                  <span key={i} className={`bt-casa${(r + c) % 2 === 0 ? " clara" : ""}${temRainha ? " rainha" : ""}`}>
                    {temRainha ? "♛" : ""}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <p className="viz-note ok">
          As duas versões devolvem <strong>{com.solucoes.length} soluções</strong>
          {mesmasSolucoes ? ", e são as mesmas soluções, uma a uma" : ""}. A poda não troca a resposta por uma
          aproximação, ela só evita descer por caminhos que já são impossíveis: com {n} rainhas, ela corta{" "}
          {thousands(com.podas)} escolhas antes de virarem ramo e visita <strong>{thousands(com.nos)}</strong> nós contra{" "}
          <strong>{thousands(sem.nos)}</strong>, {razao.toFixed(1)} vezes menos. É a diferença entre perguntar
          &quot;isto ainda pode dar certo?&quot; a cada passo e perguntar só no fim.
        </p>

        <p className="viz-caption" style={{ margin: "12px 0 0" }}>
          Repare em como a razão cresce com o tabuleiro: 20x com 4 rainhas, 366x com 6 e 1.741x com 7. Podar
          não muda a classe de complexidade (as duas continuam exponenciais) e muda o expoente na prática, que
          é o que separa um algoritmo que roda de um que não termina. Com 8 rainhas a versão sem poda visitaria
          19.173.961 nós, e é por isso que ela não está aqui: desenhar essa barra custaria segundos de CPU do
          seu navegador. É a mesma ideia que aparece depois em programação dinâmica,
          com um nome diferente: em vez de cortar o ramo impossível, guardar o resultado do ramo já calculado.
        </p>
      </div>

      {/* Sem linha do tempo e sem botões extras, o `VizFooter` não desenha nada.
          Fica declarado para o próximo leitor ver que a ausência é escolha. */}
      <VizFooter viz={viz} />
    </figure>
  );
}
