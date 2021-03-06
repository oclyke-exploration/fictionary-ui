import React, {
  useState,
  useEffect,
} from 'react';
import {
  BrowserRouter as Router,
  withRouter,
  Switch,
  Route,
  Link as RouterLink,
  Redirect,
  useRouteMatch,
  useParams,
} from "react-router-dom";
import socketIOClient from 'socket.io-client';

import {SocketPort} from './secrets';

import ClipboardJS from 'clipboard';

import { makeStyles } from '@material-ui/core/styles';
import Box from '@material-ui/core/Box';
import Container from '@material-ui/core/Container';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import Link from '@material-ui/core/Link';
import IconButton from '@material-ui/core/IconButton';
import Tooltip from '@material-ui/core/Tooltip';
import Divider from '@material-ui/core/Divider';
import Radio from '@material-ui/core/Radio';
import useMediaQuery from '@material-ui/core/useMediaQuery';

import LaunchRoundedIcon from '@material-ui/icons/Launch';
import LoopRoundedIcon from '@material-ui/icons/LoopRounded';
import AddCircleOutlineRoundedIcon from '@material-ui/icons/AddCircleOutlineRounded';
import ArrowForwardRoundedIcon from '@material-ui/icons/ArrowForwardRounded';
import SendRoundedIcon from '@material-ui/icons/SendRounded';
import SettingsIcon from '@material-ui/icons/Settings';

import SessionSelector from './SessionSelector';
import WordProposer from './WordProposer';
import WordCard from './WordCard';
import PlayerCard from './PlayerCard';

import {Player, Definition, Word, Session, computeScore} from './Elements';

var Sentencer = require('sentencer');

const palette = ['#EB9694', '#FAD0C3', '#FEF3BD', '#C1E1C5', '#BEDADC', '#C4DEF6', '#BED3F3', '#D4C4FB'];

var clipboard = new ClipboardJS('.copybtn');
clipboard.on('success', function(e) {
    console.log(e);
});
clipboard.on('error', function(e) {
    console.log(e);
});


let socket: SocketIOClient.Socket;

const uji = (event: string, payload: object | string) => { // uniform JSON initiator
  socket.emit(event, JSON.stringify(payload));
}

type UJEmsg = {req: unknown, res: unknown}
const uje = (event: string, cb: (event: string, msg: UJEmsg) => void) => { // uniform JSON endpoint
  const handler = (data: any) => {
    const msg = JSON.parse(data);
    console.log(`response for event '${event}'`, msg);
    cb(event, msg);
  }
  socket.on(event, handler);
}

const ensureSocket = () => {
  if((typeof(socket) !== 'undefined') && (socket.connected)){
    return;
  }
  // socket = socketIOClient(`https://localhost:${443}`);
  // socket = socketIOClient(`https://localhost:${SocketPort}`);
  socket = socketIOClient(`https://games.oclyke.dev:${SocketPort}`);
  console.log('socket created!', socket);
}

const suggestId = () => {
  return Sentencer.make('{{ adjective }}-{{ noun }}');
}

const useStyles = makeStyles({
  bullet: {
    display: 'inline-block',
    margin: '0 2px',
    transform: 'scale(0.8)',
  },
});

const preventDefault = (event: React.SyntheticEvent) => event.preventDefault();

const Sluicebox = (props: {children: any}) => {
  return (
    <Grid container>
      <Grid item xs={1}  sm={2}  md={3}/>
      <Grid item xs={10} sm={8}  md={6}>
        {props.children}
      </Grid>
      <Grid item xs={1}  sm={2}  md={3}/>
    </Grid>
  );
}

/**************************************************************
                            Game Page
**************************************************************/

const Game = withRouter(({ history }) => {
  let { sessionid } = useParams();
  let rootroute = useRouteMatch();

  const narrowscreen = !useMediaQuery('(min-width:450px)');
  
  const [player, setPlayer] = useState<Player>(new Player().setName(suggestId()));
  const [session, setSession] = useState<Session>(new Session().setID(sessionid).addPlayers(player));


  const shareurl = `https://games.oclyke.dev${rootroute.url}`;

  
  const getPlayerItemWidth = (session: Session) => {
    let playeritemwidth: 2 | 3 | 4 | 6 = 2;
    const playeritemdivision = 12/session.players.length;
    if(playeritemdivision >= 3){
      playeritemwidth = 3;
    }
    if(playeritemdivision >= 4){
      playeritemwidth = 4;
    }
    if(playeritemdivision >= 6){
      playeritemwidth = 6;
    }
    return playeritemwidth;
  }


  // make an ordered players list
  const ordered_players = [...session.players.filter(p => p.equals(player)), ...session.players.filter(p => !p.equals(player)).sort((a, b) => computeScore(session, b) - computeScore(session, a))];

  // an effect that runs on first render
  useEffect(() => {
    console.log('game page');
    ensureSocket();

    window.addEventListener('beforeunload', (e) => {
      console.log('unloading window - disconnecting user');
      socket.disconnect();
    })

    uje('join', (event, msg: any) => {
      const idy = msg.res.num_players - 1;
      const idx = palette.length - idy - 1;
      const new_color = palette[((idx > 3) ? (2*(idx-4))+1 : 2*idx ) % palette.length];

      // set the 'to' color of this user
      let to = Player.from(player);
      to.setColor(new_color);

      uji('modify_player', {id: sessionid, from: player, to: to});
      setPlayer(to);
    });

    uje('modify_player', (event, msg) => {

    })

    uje('session', (event, msg) => {
      setSession(Session.fromAny(msg.res));
    });

    uji('join', session);
  }, []);

  // an effect when the user navigates
  useEffect(() => history.listen(() => {
    socket.disconnect();  // when all sockets disconnect the game will be deleted
  }), [])

  return <>
    {/* flexbox for header-players-words-suggestions */}
    <Box display='flex' flexDirection='column' justifyContent='space-between' style={{width: '100%', height: '100%'}}>

      {/* header */}
      <Container style={{paddingBottom: '0px'}}>
        <Typography variant='h1' align='center' style={{fontSize: 36}}>
          <Link href='/fictionary'>
            fictionary
          </Link>
          {!narrowscreen &&
          <span style={{fontSize: 16, marginLeft: '24px', position: 'relative', top: '-4px'}}>
            {sessionid}
          </span>}
          <Tooltip title='copy game link'>
            <IconButton
              className='copybtn'
              style={{margin: 0}}
              color='primary'
              data-clipboard-text={shareurl}
            >
              <LaunchRoundedIcon />
            </IconButton>
          </Tooltip>
        </Typography>
      </Container>

      {/* players */}
      <Box p={1} style={{paddingTop: 0, paddingBottom: 0}}>
        <Grid item container>
          {ordered_players.map((player_mapped, idx) => { return <>
          <Grid item xs={getPlayerItemWidth(session)} key={`player.${player_mapped.uuid}.info`}>
            <PlayerCard 
              session={session}
              player={player_mapped}
              editable={player_mapped.equals(player)}
              onPlayerChange={(from: Player, to: Player) => {
                uji('modify_player', {id: sessionid, from: from, to: to});
                setPlayer(to);
              }}
            />
          </Grid> </>})}
        </Grid>
      </Box>
      <Divider style={{marginLeft: '8px', marginRight: '8px'}}/>
      
      {/* words */}
      <Box flexGrow={1} style={{overflow: 'auto'}}>
        <Sluicebox>
            <Box display='flex' flexDirection='column'>
              {session.words.map(word => { return <>
              <Box key={`words.${word.uuid}`} style={{alignSelf: `flex-${(word.author.equals(player)) ? 'end' : 'start'}`}}>
                <WordCard
                  word={word}
                  player={player}
                  onPoseDefinition={(posed: Definition) => {
                    uji('add_definition', {id: sessionid, word: word, definition: posed});
                  }}
                  onVote={(selected) => {
                    uji('add_vote', {id: sessionid, word: word, definition: selected, voter: player});
                  }}
                  onModifyWord={(from: Word, to: Word) => {
                    uji('modify_word', {id: sessionid, from: from, to: to});
                  }}
                  onDeleteWord={(word: Word) => {
                    uji('delete_word', {id: sessionid, word: word});
                  }}
                  />
              </Box> </>})}
            </Box>
        </Sluicebox>
      </Box>

      {/* suggestions */}
      <Box>
        <Sluicebox>
          <WordProposer
            player={player}
            onSubmit={(word) => {
              uji('add_word', {id: sessionid, word: word});
            }}
            />
        </Sluicebox>
      </Box>
    </Box>
</>});

const Games = (props: any) => {
  let root = useRouteMatch();
  return (
    <Switch>
      <Route path={`${root.url}/:sessionid`} component={Game}/>
    </Switch>
  );
}

/**************************************************************
                            Start Page
**************************************************************/

const Start = (props: any) => {
  const [sessionid, setSessionid] = useState(suggestId());
  const [idactive, setIDActive] = useState<boolean>(false);
  const [start, setStart] = useState(false);

  const classes = useStyles();
  const bull = <span className={classes.bullet}>•</span>;

  // an effect that runs on first render
  useEffect(() => {
    console.log('start page');
    ensureSocket();

    uje('idstatus', (event, msg) => {
      if(typeof(msg.res) === 'boolean'){
        setIDActive(msg.res);
      }
    });

  }, []);

  return (
    <>
      <Box display='flex' flexDirection='column' justifyContent='space-between' style={{width: '100%', height: '100%'}}>
        {/* <Grid item container direction='column'> */}
        <Box>
          <Sluicebox>
            <Typography variant='h1' align='center' style={{fontSize: 36, marginTop: '12px'}}>
              fictionary
            </Typography>
            <Box style={{marginTop: '16px'}}>
              <SessionSelector
                id={sessionid}
                join={idactive}
                onSuggest={(e) => {
                  const newid = suggestId();
                  setSessionid(newid);
                  uji('idstatus', newid);
                }}
                onChange={(e) => {
                  const newid = e.target.value;
                  setSessionid(newid);
                  uji('idstatus', newid);
                }}
                onSubmit={(e) => {
                  preventDefault(e);
                  setStart(true);
                }}
              />
            </Box>
            <Typography color='textSecondary' style={{fontSize: 24, marginTop: '16px'}}>
              fic{bull}tion{bull}ar{bull}y
            </Typography>
            <Typography color='textSecondary' style={{fontSize: 14, marginTop: '8px'}}>
              /'fikSHə,nerē/ {bull} <i>noun</i>
            </Typography>
            <Typography>
              a game of camouflage, misdirection, and astonishment in which players guess the true definition of obscure words
            </Typography>
            <Divider style={{marginTop: '8px'}}/>
            <Typography color='textSecondary' style={{fontSize: 24, marginTop: '8px'}}>
              how to play
            </Typography>
          </Sluicebox>
        </Box>


        <Box flexGrow={1} style={{overflow: 'auto'}}>
          <Sluicebox>
            {/* starting a game */}
            <Typography color='textSecondary' style={{marginBottom: '0px', paddingBottom: '0px'}}>
              <i>setup</i>
            </Typography>
            <Typography component={'span'}>
              <ul style={{marginTop: 0, listStyle: 'none'}}>
                <li>
                  <IconButton color='primary' size='small'>
                    <LoopRoundedIcon />
                  </IconButton>
                  <span>create a unique identifier for your group session</span>
                  <ul style={{listStyle: 'none'}}>
                    <li>
                      <IconButton color='primary' size='small'>
                        <AddCircleOutlineRoundedIcon />
                      </IconButton>
                      <span>create a new session</span>
                    </li>
                    <li>
                      <IconButton color='primary' size='small'>
                        <ArrowForwardRoundedIcon />
                      </IconButton>
                      <span>join an existing session</span>
                    </li>
                  </ul>
                </li>
                <li>
                  <IconButton color='primary' size='small'>
                    <LaunchRoundedIcon />
                  </IconButton>
                  <span>copy the link to share with friends</span>
                </li>
              </ul>
            </Typography>

            {/* playing the game */}
            <Typography color='textSecondary' style={{marginBottom: '0px', paddingBottom: '0px'}}>
              <i>gameplay</i>
            </Typography>
            <Typography component={'span'}>
              <ul style={{marginTop: 0, listStyle: 'none'}}>
                <li>
                  <IconButton color='primary' size='small'>
                    <SendRoundedIcon />
                  </IconButton>
                  <span>add unique words with their real definitions</span>
                </li>
                <li>
                  <IconButton color='primary' size='small'>
                    <SendRoundedIcon />
                  </IconButton>
                  <span>add made-up definitions to other player's words</span>
                </li>
                <li>
                  {/* radio button */}
                  <Radio
                    color='primary'
                    checked={true}
                    style={{marginLeft: '-7px', marginRight: '-5px'}}
                  />
                  <span>vote on the definitions you think are real</span>
                </li>
              </ul>
            </Typography>

            {/* scoring */}
            <Typography color='textSecondary' style={{marginBottom: '0px', paddingBottom: '0px'}}>
              <i>scoring as a voter</i>
            </Typography>
            <Typography component={'span'}>
              <ul style={{marginTop: 0, listStyle: 'none'}}>
                <li>
                  <span>+1 when your false definition is voted for</span>
                </li>
                <li>
                  <span>+2 when you vote for the true definition</span>
                </li>
              </ul>
            </Typography>
            <Typography color='textSecondary' style={{marginBottom: '0px', paddingBottom: '0px'}}>
              <i>scoring as the proposer</i>
            </Typography>
            <Typography component={'span'}>
              <ul style={{marginTop: 0, listStyle: 'none'}}>
                <li>
                  <span>a point for every voter - if the real definition receives no votes</span>
                </li>
              </ul>
            </Typography>
          </Sluicebox>
        </Box>

        <Box>
          <Sluicebox>
            <Divider style={{marginTop: '8px'}}/>
            <Typography variant='subtitle2' align='center' style={{paddingBottom: '8px', paddingTop: '8px'}}>
              <Link href='https://oclyke.dev' target='_blank' rel='noreferrer'>
                oclyke
              </Link>
              {bull}
              <Link href='https://github.com/oclyke-exploration/fictionary' target='_blank' rel='noreferrer'>
                GitHub
              </Link>
            </Typography>
          </Sluicebox>
        </Box>
      </Box>

      {start && <Redirect to={`/fictionary/session/${sessionid}`}/>}
    </>
  );
}

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path='/fictionary/session' component={Games}/>
        <Route path='/fictionary' component={Start}/>
      </Switch>
    </Router>
  );
}

export default App;
