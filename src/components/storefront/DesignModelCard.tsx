import { Link } from 'react-router-dom';
import { modelSkus, skuOffer, skuPackages, type PublicDesignModel, type StoreReadModel } from '@/lib/storeReadModel';

export function DesignModelCard({ model, store }: { model: PublicDesignModel; store: StoreReadModel }) {
  const skus = modelSkus(store, model.id); const first = skus[0]; const offer = first ? skuOffer(store, first.id) : null; const preview = first ? skuPackages(store, first.id)[0]?.mainPreviewPath : null;
  return <Link to={`/design/${model.slug || model.id}`} className="group overflow-hidden rounded-2xl border border-[#2c323d] bg-[#121418] hover:border-[#c7a86f]/50">
    <div className="aspect-square bg-[#191e27]">{preview ? <img src={preview} alt={`${model.name} Main watchface preview`} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-5xl text-[#657083]">⌚</div>}</div>
    <div className="p-4"><p className="text-base text-[#e7e9ee]">{model.name}</p><p className="mt-1 text-xs text-[#8993a3]">{skus.length} color/edition option{skus.length === 1 ? '' : 's'}</p>{offer && <p className="mt-2 text-sm text-[#e8d2a8]">From ${(offer.campaignPrice ?? offer.regularPrice).toFixed(2)}</p>}</div>
  </Link>;
}
