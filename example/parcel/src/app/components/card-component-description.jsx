let React = require('react');

class CardComponentDescription extends React.Component{
    getStyle() {
        return {
            cardComponentDescription: {
                color: 'rgb(33, 33, 33)',
                fontFamily: 'RobotoDraft, Roboto, sans-serif',
                fontSize: '18px',
                marginBottom: '8px'
            }
        };
    }
    render() {
        let style = this.getStyle();
        return (
            <div style={style.cardComponentDescription}>{this.props.description}</div>
        );
    }
};

module.exports = CardComponentDescription;
