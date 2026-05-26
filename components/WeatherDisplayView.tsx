import React from 'react';
import { AstroForecastHour } from '../types';
import { Target, Star, Moon, CloudMoon, Cloud, Cloudy, Smile, Frown } from 'lucide-react';

const WeatherDisplayView: React.FC<{
    imagingWindowData: AstroForecastHour[];
    isLoading: boolean;
    error: string | null;
}> = ({ imagingWindowData, isLoading, error }) => {
    
    const getDewRiskColor = (level: 'Critical' | 'Warning' | 'Safe') => {
        if (level === 'Critical') return 'bg-red-900/50 text-red-300 border-red-600/60';
        if (level === 'Warning') return 'bg-yellow-900/50 text-yellow-300 border-yellow-600/60';
        return 'bg-green-900/50 text-green-300 border-green-600/60';
    };

    const getSeeingColor = (seeing: 'I' | 'II' | 'III' | 'IV' | 'V') => {
        switch(seeing) {
            case 'I': return 'text-green-400';
            case 'II': return 'text-lime-400';
            case 'III': return 'text-yellow-400';
            case 'IV': return 'text-orange-400';
            case 'V': return 'text-red-500';
            default: return 'text-text-secondary';
        }
    };

    const getSkyIcon = (condition: string) => {
        switch (condition) {
            case 'Clear': return <Star size={20} className="text-yellow-400" />;
            case 'Mostly Clear': return <Moon size={20} className="text-blue-300" />;
            case 'Partly Cloudy': return <CloudMoon size={20} className="text-gray-300" />;
            case 'Mostly Cloudy': return <Cloud size={20} className="text-gray-400" />;
            case 'Overcast': return <Cloudy size={20} className="text-gray-500" />;
            default: return <Cloud size={20} className="text-gray-400" />;
        }
    };

    if (isLoading) return <p className="text-text-secondary text-center py-8">Calculating imaging window forecast...</p>;
    if (error) return <p className="text-red-400 text-center py-8">{error}</p>;
    if (!isLoading && imagingWindowData.length === 0) return <p className="text-text-secondary text-center py-8">No valid imaging window found for this night. It might be too short or data is unavailable.</p>;

    return (
        <div className="bg-surface border border-border rounded-lg p-4 md:p-6 space-y-4">
            <h2 className="font-display font-bold text-lg flex items-center gap-2">
                <Target size={16}/> Hourly Imaging Forecast
            </h2>
            
            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm border-collapse table-fixed">
                    <thead className="text-xs text-text/70 uppercase tracking-wider">
                        <tr className="border-b-2 border-border">
                            <th scope="col" rowSpan={2} className="p-2 text-left align-bottom font-semibold" style={{ width: '10%' }}>Time</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '12%' }}>Sky</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '10%' }}>Temp/Dew<br/>(°C)</th>
                            <th scope="colgroup" colSpan={4} className="p-2 text-center border-l border-r border-border/50">Cloud Cover (%)</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '8%' }}>Precip<br/>(mm)</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '10%' }}>Wind/Gust<br/>(km/h)</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '10%' }}>Dew Risk</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '10%' }}>Seeing</th>
                            <th scope="col" rowSpan={2} className="p-2 text-center align-bottom font-semibold" style={{ width: '8%' }}>Index</th>
                        </tr>
                        <tr className="border-b border-border bg-background/30">
                            <th scope="col" className="p-2 font-medium text-center border-l border-border/50" style={{ width: '6%' }}>Total</th>
                            <th scope="col" className="p-2 font-medium text-center" style={{ width: '6%' }}>Low</th>
                            <th scope="col" className="p-2 font-medium text-center" style={{ width: '6%' }}>Mid</th>
                            <th scope="col" className="p-2 font-medium text-center border-r border-border/50" style={{ width: '6%' }}>High</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {imagingWindowData.map(hour => (
                            <tr key={hour.time.toISOString()} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 text-left font-mono font-extrabold text-base whitespace-nowrap">
                                    {hour.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex flex-col items-center gap-1" title={hour.skyCondition}>
                                        {getSkyIcon(hour.skyCondition)}
                                        <span className="text-[10px] uppercase font-bold text-text-secondary">{hour.skyCondition}</span>
                                    </div>
                                </td>
                                <td className="p-3 text-center font-mono font-extrabold text-base whitespace-nowrap">
                                    {Math.round(hour.temp)}° / {Math.round(hour.dewpoint)}°
                                </td>
                                
                                <td className="p-3 text-center font-mono font-extrabold text-lg border-l border-border/50">{hour.clouds.total}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-lg">{hour.clouds.low}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-lg">{hour.clouds.mid}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-lg border-r border-border/50">{hour.clouds.high}</td>

                                <td className="p-3 text-center font-mono">{hour.precipitation}</td>
                                <td className="p-3 text-center font-mono font-extrabold text-base whitespace-nowrap">
                                    {Math.round(hour.wind.speed)}/{Math.round(hour.wind.gusts)}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getDewRiskColor(hour.dewRisk.level)}`}>
                                        {hour.dewRisk.level}
                                    </span>
                                </td>
                                <td className="p-3 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className={`font-bold font-display text-lg ${getSeeingColor(hour.seeing.antoniadi)}`}>
                                          {hour.seeing.antoniadi}
                                        </span>
                                        <span className="text-xs text-text-secondary/90 -mt-1 font-mono">
                                            {hour.seeing.resolution}
                                        </span>
                                    </div>
                                </td>
                                <td className="p-3 text-center">
                                    {hour.astroIndex.isGoodForImaging ? (
                                        <Smile size={20} className="text-lime-400 inline-block" title="Good for imaging!" />
                                    ) : (
                                        <Frown size={20} className="text-orange-400 inline-block" title="Suboptimal conditions." />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="space-y-3 md:hidden">
                {imagingWindowData.map(hour => (
                    <div key={hour.time.toISOString()} className="bg-background/50 p-4 rounded-lg border border-border">
                        <div className="flex justify-between items-center mb-3 border-b border-border pb-3">
                            <div className="flex items-center gap-3">
                                <h3 className="font-mono font-extrabold text-xl text-primary">
                                    {hour.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                </h3>
                                <div className="flex items-center gap-1 bg-surface px-2 py-1 rounded-full border border-border/50">
                                    {getSkyIcon(hour.skyCondition)}
                                    <span className="text-xs font-bold uppercase text-text-secondary">{hour.skyCondition}</span>
                                </div>
                            </div>
                            {hour.astroIndex.isGoodForImaging ? (
                                <Smile size={24} className="text-lime-400" title="Good for imaging!" />
                            ) : (
                                <Frown size={24} className="text-orange-400" title="Suboptimal conditions." />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col items-center justify-center text-center p-2 rounded-md bg-surface/50">
                                <span className="text-xs text-text-secondary uppercase font-semibold">Cloud Cover</span>
                                <span className="font-mono font-extrabold text-4xl">{hour.clouds.total}%</span>
                           </div>
                           <div className="flex flex-col items-center justify-center text-center p-2 rounded-md bg-surface/50">
                               <span className="text-xs text-text-secondary uppercase font-semibold">Seeing</span>
                                <span className={`font-bold font-display text-3xl ${getSeeingColor(hour.seeing.antoniadi)}`}>
                                    {hour.seeing.antoniadi}
                                </span>
                                <span className="text-xs text-text-secondary/80 -mt-1 font-mono">
                                    {hour.seeing.resolution}
                                </span>
                           </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center mt-3 text-sm">
                            <div className="bg-surface/30 p-2 rounded">
                                <span className="text-xs text-text-secondary block">Temp/Dew</span>
                                <span className="font-mono font-bold">{Math.round(hour.temp)}°/{Math.round(hour.dewpoint)}°</span>
                            </div>
                            <div className="bg-surface/30 p-2 rounded">
                                <span className="text-xs text-text-secondary block">Wind/Gust</span>
                                <span className="font-mono font-bold">{Math.round(hour.wind.speed)}/{Math.round(hour.wind.gusts)}</span>
                            </div>
                            <div className="bg-surface/30 p-2 rounded flex flex-col items-center justify-center">
                                <span className="text-xs text-text-secondary block">Dew Risk</span>
                                <span className={`px-2 py-0.5 mt-0.5 rounded-full text-xs font-bold border ${getDewRiskColor(hour.dewRisk.level)}`}>
                                    {hour.dewRisk.level}
                                </span>
                            </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-border text-center flex justify-around text-xs font-mono text-text-secondary">
                           <span>Low: <b className="text-text">{hour.clouds.low}%</b></span>
                           <span>Mid: <b className="text-text">{hour.clouds.mid}%</b></span>
                           <span>High: <b className="text-text">{hour.clouds.high}%</b></span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeatherDisplayView;
