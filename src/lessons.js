const LESSONS=[{
 id:"min-1", course:"Accordi minori", title:"Lezione 1 · Cos'è un accordo minore",
 theory:[
  "Un <b>accordo</b> è un insieme di note suonate insieme. La forma più semplice è la <b>triade</b>: tre note, costruite saltando una nota sì e una no sulla scala.",
  "Le tre note si chiamano <b>fondamentale</b> (da cui l'accordo prende il nome), <b>terza</b> e <b>quinta</b>.",
  "È la terza a decidere se l'accordo è minore o maggiore. Nel <b>minore</b> la terza sta a <b>3 semitoni</b> dalla fondamentale e la quinta a 7. Nel maggiore la terza sta a 4.",
  "Esempio: <b>La minore</b> = La – Do – Mi. Do è 3 semitoni sopra La, Mi è 7 sopra. Se alzi il Do di un semitono (Do♯) ottieni La maggiore, un suono più luminoso. Il minore suona più scuro e malinconico. Ascolta la differenza:"
 ],
 demo:[{label:"La minore",notes:[57,60,64]},{label:"La maggiore",notes:[57,61,64]}],
 pattern:{bpm:60,steps:[
  {name:"La minore",root:9,beat:0,dur:1,notes:[57,60,64]},
  {name:"La minore",root:9,beat:2,dur:1,notes:[57,60,64]},
  {name:"La minore",root:9,beat:3,dur:1,notes:[69,72,76]},
  {name:"La minore",root:9,beat:4,dur:1,notes:[57,60,64]}
 ]},
 quiz:[
  {type:"mc",q:"Quanti semitoni ci sono tra fondamentale e terza in un accordo minore?",options:["2","3","4","5"],answer:1,why:"Nel minore la terza sta a 3 semitoni (nel maggiore 4)."},
  {type:"mc",q:"Quali note formano La minore?",options:["La – Do – Mi","La – Do♯ – Mi","La – Re – Mi","La – Do – Fa"],answer:0,why:"La minore = La, Do (3 semitoni sopra), Mi (7 sopra)."},
  {type:"open",q:"Quante note ha una triade?",accept:["3","tre"],why:"Una triade ha 3 note: fondamentale, terza, quinta."},
  {type:"open",q:"Come si chiama la nota da cui l'accordo prende il nome?",accept:["fondamentale","tonica"],why:"Si chiama fondamentale."},
  {type:"open",q:"Per passare da La maggiore (La Do♯ Mi) a La minore, quale nota abbassi di un semitono?",accept:["do#","terza","la terza"],why:"Si abbassa la terza: Do♯ diventa Do."}
 ]
}];
