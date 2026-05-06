import { useState } from 'react';

const ALPHABETS = [
    { id: 'sign_01', letter: '\u0D05' },
    { id: 'sign_02', letter: '\u0D06' },
    { id: 'sign_03', letter: '\u0D07' },
    { id: 'sign_04', letter: '\u0D08' },
    { id: 'sign_05', letter: '\u0D09' },
    { id: 'sign_06', letter: '\u0D0A' },
    { id: 'sign_07', letter: '\u0D0B' },
    { id: 'sign_08', letter: '\u0D0E' },
    { id: 'sign_09', letter: '\u0D0F' },
    { id: 'sign_10', letter: '\u0D10' },
    { id: 'sign_11', letter: '\u0D12' },
    { id: 'sign_12', letter: '\u0D13' },
    { id: 'sign_13', letter: '\u0D14' },
    { id: 'sign_14', letter: '\u0D05' + '\u0D66' },
    { id: 'sign_15', letter: '\u0D05' + '\u0D03' },
    { id: 'sign_16', letter: '\u0D15' },
    { id: 'sign_17', letter: '\u0D16' },
    { id: 'sign_18', letter: '\u0D17' },
    { id: 'sign_19', letter: '\u0D18' },
    { id: 'sign_20', letter: '\u0D19' },
    { id: 'sign_21', letter: '\u0D1A' },
    { id: 'sign_22', letter: '\u0D1B' },
    { id: 'sign_23', letter: '\u0D1C' },
    { id: 'sign_24', letter: '\u0D1D' },
    { id: 'sign_25', letter: '\u0D1E' },
    { id: 'sign_26', letter: '\u0D1F' },
    { id: 'sign_27', letter: '\u0D20' },
    { id: 'sign_28', letter: '\u0D21' },
    { id: 'sign_29', letter: '\u0D22' },
    { id: 'sign_30', letter: '\u0D23' },
    { id: 'sign_31', letter: '\u0D24' },
    { id: 'sign_32', letter: '\u0D25' },
    { id: 'sign_33', letter: '\u0D26' },
    { id: 'sign_34', letter: '\u0D27' },
    { id: 'sign_35', letter: '\u0D28' },
    { id: 'sign_36', letter: '\u0D2A' },
    { id: 'sign_37', letter: '\u0D2B' },
    { id: 'sign_38', letter: '\u0D2C' },
    { id: 'sign_39', letter: '\u0D2D' },
    { id: 'sign_40', letter: '\u0D2E' },
    { id: 'sign_41', letter: '\u0D2F' },
    { id: 'sign_42', letter: '\u0D30' },
    { id: 'sign_43', letter: '\u0D32' },
    { id: 'sign_44', letter: '\u0D35' },
    { id: 'sign_45', letter: '\u0D36' },
    { id: 'sign_46', letter: '\u0D37' },
    { id: 'sign_47', letter: '\u0D38' },
    { id: 'sign_48', letter: '\u0D39' },
    { id: 'sign_49', letter: '\u0D33' },
    { id: 'sign_50', letter: '\u0D34' },
    { id: 'sign_51', letter: '\u0D31' },
    { id: 'sign_52', letter: '\u0D7A' },
    { id: 'sign_53', letter: '\u0D7E' },
    { id: 'sign_54', letter: '\u0D7C' },
    { id: 'sign_55', letter: '\u0D7D' },
    { id: 'sign_56', letter: '\u0D15' + '\u0D3E' },
    { id: 'sign_57', letter: '\u0D15' + '\u0D3F' },
    { id: 'sign_58', letter: '\u0D15' + '\u0D40' },
    { id: 'sign_59', letter: '\u0D15' + '\u0D41' },
    { id: 'sign_60', letter: '\u0D15' + '\u0D42' },
    { id: 'sign_61', letter: '\u0D15' + '\u0D43' },
    { id: 'sign_62', letter: '\u0D15' + '\u0D46' },
    { id: 'sign_63', letter: '\u0D15' + '\u0D47' },
    { id: 'sign_64', letter: '\u0D15' + '\u0D48' },
    { id: 'sign_65', letter: '\u0D15' + '\u0D4A' },
    { id: 'sign_66', letter: '\u0D15' + '\u0D4B' },
    { id: 'sign_67', letter: '\u0D15' + '\u0D57' },
    { id: 'sign_68', letter: '\u0D15' + '\u0D4D' + '\u0D2F' },
    { id: 'sign_69', letter: '\u0D15' + '\u0D4D' + '\u0D30' },
    { id: 'sign_70', letter: '\u0D15' + '\u0D4D' + '\u0D35' },
    { id: 'sign_71', letter: '\u0D15' + '\u0D4D' },
];

export default function AlphabetTutorial() {
    const [selected, setSelected] = useState(null);

    function openModal(alpha) { setSelected(alpha); }
    function closeModal() { setSelected(null); }

    return (
        <>
            <div id="alphabet-tutorial" className="bg-white rounded-3xl p-8 relative overflow-hidden shadow-lg mt-8">
                <div className="absolute -top-8 -right-8 w-[600px] h-[200px] bg-brand-orange rounded-full opacity-10 pointer-events-none"></div>

                <div className="mb-6">
                    <h2 className="text-2xl font-bold text-brand-dark" style={{ fontFamily: 'var(--font-work-sans)' }}>
                        Malayalam Sign Language Tutorial
                    </h2>
                    <p className="text-gray-500 mt-1" style={{ fontFamily: 'var(--font-inter)' }}>
                        Click any letter to watch the corresponding sign language video.
                    </p>
                </div>

                <div className="alpha-grid">
                    {ALPHABETS.map((alpha) => {
                        const isActive = selected !== null && selected.id === alpha.id;
                        return (
                            <button
                                key={alpha.id}
                                onClick={() => openModal(alpha)}
                                title={alpha.letter}
                                className={isActive ? 'alpha-btn active' : 'alpha-btn'}
                            >
                                {alpha.letter}
                            </button>
                        );
                    })}
                </div>
            </div>

            {selected !== null && (
                <div className="alpha-modal-overlay" onClick={closeModal}>
                    <div className="alpha-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="alpha-modal-header">
                            <div className="alpha-modal-title-row">
                                <div className="alpha-letter-icon">{selected.letter}</div>
                                <div>
                                    <p className="alpha-modal-subtitle">Sign Tutorial</p>
                                    <h3 className="alpha-modal-title">
                                        {selected.letter} — {selected.id.replace('_', ' ').toUpperCase()}
                                    </h3>
                                </div>
                            </div>
                            <button className="alpha-close-btn" onClick={closeModal}>&#x2715;</button>
                        </div>

                        <video key={selected.id} controls autoPlay loop className="alpha-video">
                            <source src={'/videos/' + selected.id + '.mp4'} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>

                        <p className="alpha-video-label">
                            File: <code>{selected.id}.mp4</code>
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
