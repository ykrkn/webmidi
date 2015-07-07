/// <reference path="./include/webmidi/webmidi.d.ts" />

// http://www.midi.org/techspecs/midimessages.php

/**
 *
 *  Create your own receiver
 *
 *  var ConsoleLogReceiver = (function (_super) {
 *      __extends(ConsoleLogReceiver, _super);
 *      function ConsoleLogReceiver() { _super.apply(this, arguments); }
 *
 *      ConsoleLogReceiver.prototype.onMessage = function (e) {
 *          console.log(e);
 *      };
 *
 *      return ConsoleLogReceiver;
 *  })(midi.Receiver);
 *
 */
export class Consts {
    public static NOTE_ON_MSG:number        = 0x90; // 1001nnnn
    public static NOTE_OFF_MSG:number       = 0x80; // 1000nnnn
    public static CC_MSG:number             = 0xB0; // 1011nnnn
    public static PITCH_MSG:number          = 0xE0; // 1110nnnn
}

export class Gateway {
    private midi:WebMidi.MIDIAccess;
    private inPort:WebMidi.MIDIInput;
    private outPort:WebMidi.MIDIOutput;
    private senders:Sender[]     = [];
    // index 0-15 for MIDI channels, 16 - for non-channel receivers.
    private receivers:Receiver[][] = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];
    private clock:number[] = [0, 0, 0]; // last timestamp, count, explicit BPM

    checkCompatibility(success:Function, error:Function){
        if(undefined == navigator.requestMIDIAccess)
            error.apply(null, "Browser not supports WebMIDI");

        navigator.requestMIDIAccess().then((midi) => {
            this.midi = midi;
            success.apply(null);
        }, function(err){
            error.apply(null, err);
        } );
    }

    getAvailableInputs():WebMidi.MIDIInputMap {
        return this.midi.inputs;
    }

    getAvailableOutputs():WebMidi.MIDIOutputMap {
        return this.midi.outputs;
    }

    getExtBPM():number{
        return this.clock[2];
    }

    selectInput(id:string){
        var newPort:WebMidi.MIDIInput = this.midi.inputs.get(id);

        if(this.inPort != null)
            this.inPort.onmidimessage = null;

        this.inPort = newPort;

        this.inPort.onmidimessage = (evt:WebMidi.MIDIMessageEvent)=>{
            // Calculate BPM on External Clock TODO: reset value on lost clock
            if(evt.data.length == 1 && evt.data[0] == 0xF8){
                if(++this.clock[1] % 24 == 0){
                    this.clock[2] = Math.round(1000/(evt.timeStamp - this.clock[0])*60);
                    this.clock[0] = evt.timeStamp;
                }
            }

            if(evt.data.length == 3){
                this.receivers[evt.data[0] & 0x0F].forEach((e)=>{ e.onMessage(evt); });
            } else {
                this.receivers[16].forEach((e)=>{ e.onMessage(evt); });
            }
        }
    }

    selectOutput(id:string){
        this.outPort = this.midi.outputs.get(id);
        this.senders.forEach((e)=>{e.setOutPort(this.outPort)});
    }

    addSender(value:Sender){
        this.senders.push(value);
        if(this.outPort) value.setOutPort(this.outPort);
    }

    addReceiver(value:Receiver){
        var ch = (value instanceof ChannelReceiver ? (<ChannelReceiver>value).respondToChannel() : 16);
        this.receivers[ch].push(value);
    }
}

export class Sender {

    /* protected */
    public port:WebMidi.MIDIOutput;

    setOutPort(port:WebMidi.MIDIOutput) {
        this.port = port;
    }
}

export class Receiver {

    onMessage(evt:WebMidi.MIDIMessageEvent){}
}

export class ChannelSender extends Sender {

    private channel:number;

    setChannel(channel:number) {
        this.channel = channel;
    }

    noteOn(note:number, velocity:number){
        this.port.send([Consts.NOTE_ON_MSG & this.channel, note, velocity]);
    }

    noteOff(note:number, velocity:number){
        this.port.send([Consts.NOTE_OFF_MSG & this.channel, note, velocity]);
    }

    cc(controller:number, value:number){
        this.port.send([Consts.CC_MSG & this.channel, controller, value]);
    }

    pitch(value:number){
        this.port.send([Consts.PITCH_MSG & this.channel, 0x2000]);
    }

}

export class ChannelReceiver extends Receiver {

    private channel:number;

    setChannel(channel:number) {
        this.channel = channel;
    }

    respondToChannel():number {
        return this.channel;
    }

    onMessage(evt:WebMidi.MIDIMessageEvent){
        var v1:number = evt.data[1] & 0x7F;
        var v2:number = evt.data[2] & 0x7F;
        switch(evt.data[0] & 0xF0){
            case Consts.NOTE_ON_MSG: return this.onNoteOn(v1, v2);
            case Consts.NOTE_OFF_MSG: return this.onNoteOff(v1, v2);
            case Consts.CC_MSG: return this.onCc(v1, v2);
            case Consts.PITCH_MSG: return this.onPitch(v1+v2<<8);
        }
    }

    onNoteOn(note:number, velocity:number){}

    onNoteOff(note:number, velocity:number){}

    onCc(controller:number, value:number){}

    onPitch(value:number){}
}