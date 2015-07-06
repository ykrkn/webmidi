/// <reference path="./include/webmidi/webmidi.d.ts" />

// http://www.midi.org/techspecs/midimessages.php

export interface IInput {
    setInPort(port:WebMidi.MIDIInput);
}

export interface IOutput {
    setOutPort(port:WebMidi.MIDIOutput);
}

export class Consts {
    public static NOTE_ON_MSG:number        = 0x90; // 1001nnnn
    public static NOTE_OFF_MSG:number       = 0x80; // 1000nnnn
    public static CC_MSG:number             = 0xB0; // 1011nnnn
    public static PITCH_MSG:number          = 0xE0; // 1110nnnn
}

export class Gateway implements IInput, IOutput {

    private inPort:WebMidi.MIDIInput;
    private outPort:WebMidi.MIDIOutput;
    private senders:Sender[]     = [];
    // index 0-15 for MIDI channels, 16 - for non-channel receivers.
    private receivers:Receiver[][] = [[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[],[]];

    setInPort(port:WebMidi.MIDIInput){
        this.inPort = port;
        this.inPort.onmidimessage = (evt:WebMidi.MIDIMessageEvent)=>{
            if(evt.data.length == 3){
                this.receivers[evt.data[0] & 0x0F].forEach((e)=>{ e.onMessage(evt); });
            }
        }
    }

    setOutPort(port:WebMidi.MIDIOutput) {
        this.outPort = port;
        this.senders.forEach((e)=>{e.setOutPort(port)});
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

export class Sender implements IOutput{

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